import type {
    SetPlaysDataSelectionReturnType,
    SetPlayAdminDataType,
    SetPlaySelectionType,
    SetPlayPayloadType
} from '@/db/models/games/set-plays-data';
import type { StartingLineupType } from '@/db/models/games/starting-lineup';

import { z } from 'zod';

import { MAX_SET_PLAYS_PER_ROUND } from '@/db/db.constants';
import {
    getSetPlaySelectionLimit,
    getStartingLineupPlayerIds
} from '@/db/db.utils';
import ScheduleModel from '@/db/models/games/schedule';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import LigueGroupsModel from '@/db/models/ligue-groups';
import PlayersModel from '@/db/models/players';
import { objectIdSchema, SetPlayEnumType } from '@/db/models/schema.types';
import UserModel from '@/db/models/user';

export const validateDate = (value: string) => {
    if (!value) {
        return false;
    }

    const [day, month, year] = value.split('-');

    const d = new Date(`${year}-${month}-${day}`);

    if (
        d &&
        d.getMonth() + 1 === Number(month) &&
        d.getDate() === Number(day) &&
        d.getFullYear() === Number(year)
    ) {
        return true;
    }

    return false;
};

export async function getSetPlayLineup(startingLineupId: string) {
    const id = objectIdSchema.unwrap().parse(startingLineupId).toLowerCase();
    const lineup = await StartingLineupModel.findById(id).exec();
    if (!lineup) {
        throw new Error(`Invalid startingLineupId: ${id}`);
    }
    return lineup;
}

async function getAssignmentField(userId: string) {
    const user = await UserModel.findById(userId).exec();
    const group = user?.groupName
        ? await LigueGroupsModel.findById(user.groupName).exec()
        : null;
    if (group?.groupName === 'dolce') {
        return 'dolceUserId' as const;
    }
    if (group?.groupName === 'gabbana') {
        return 'gabbanaUserId' as const;
    }
    throw new Error(`No regular-season draft group for userId: ${userId}`);
}

export async function validateSetPlaySelections(
    lineup: StartingLineupType,
    plays: SetPlayPayloadType[]
) {
    const userId = lineup.userId?.toString();
    if (!userId) {
        throw new Error('Starting lineup has no owner');
    }
    const playerIdList = plays.flatMap(play => {
        if (!('userData' in play)) {
            return [];
        }
        if ('playerId' in play.userData) {
            return [play.userData.playerId];
        }
        if ('leaderIdList' in play.userData) {
            return play.userData.leaderIdList;
        }
        if ('ownPlayerId' in play.userData) {
            return [play.userData.ownPlayerId, play.userData.opponentPlayerId];
        }
        return [];
    });
    const players = await PlayersModel.find({
        _id: { $in: playerIdList }
    }).exec();
    const playersById = new Map(
        players.map(player => [player._id.toString(), player])
    );
    for (const id of playerIdList) {
        if (!playersById.has(id)) {
            throw new Error(`Invalid playerId: ${id}`);
        }
    }

    const needsOwnGroup = plays.some(play => {
        return [
            SetPlayEnumType.Rezerwa,
            SetPlayEnumType.RezerwaGielda,
            SetPlayEnumType.Spartacus
        ].some(type => type === play.type);
    });
    const ownAssignment = needsOwnGroup
        ? await getAssignmentField(userId)
        : undefined;
    const needsOpponent = plays.some(play => {
        return [
            SetPlayEnumType.Spartacus,
            SetPlayEnumType.Typer,
            SetPlayEnumType.Awatar
        ].some(type => type === play.type);
    });
    let opponentId: string | undefined;
    if (needsOpponent) {
        const schedule = await ScheduleModel.getScheduleIdByUserAndRoundNumber(
            userId,
            lineup.roundNumber
        );
        if (!schedule) {
            throw new Error('Scheduled opponent not found');
        }
        opponentId =
            schedule.userOneId === userId
                ? schedule.userTwoId
                : schedule.userOneId;
        if (!opponentId || opponentId === userId) {
            throw new Error('Invalid scheduled opponent');
        }
    }
    const needsOpponentGroup = plays.some(play => {
        return [SetPlayEnumType.Spartacus, SetPlayEnumType.Awatar].some(
            type => type === play.type
        );
    });
    const opponentAssignment =
        needsOpponentGroup && opponentId
            ? await getAssignmentField(opponentId)
            : undefined;
    const opponentLineup = plays.some(
        play => play.type === SetPlayEnumType.Typer
    )
        ? await StartingLineupModel.findOne({
              userId: opponentId,
              roundNumber: lineup.roundNumber
          }).exec()
        : null;
    if (
        plays.some(play => play.type === SetPlayEnumType.Typer) &&
        !opponentLineup
    ) {
        throw new Error('Opponent starting lineup not found');
    }
    const ownLineupPlayers = getStartingLineupPlayerIds(lineup);
    const combinedLineupPlayers = [
        ...ownLineupPlayers,
        ...(opponentLineup ? getStartingLineupPlayerIds(opponentLineup) : [])
    ];
    const isOwnSquad = (id: string) => {
        return (
            ownAssignment &&
            playersById.get(id)?.[ownAssignment]?.toString() === userId
        );
    };
    const isOpponentSquad = (id: string) => {
        return (
            opponentAssignment &&
            playersById.get(id)?.[opponentAssignment]?.toString() === opponentId
        );
    };

    for (const play of plays) {
        switch (play.type) {
            case SetPlayEnumType.GwarancjaStartow:
            case SetPlayEnumType.RyszardKowalski:
                if (!ownLineupPlayers.includes(play.userData.playerId)) {
                    throw new Error(
                        'Player must belong to the starting lineup'
                    );
                }
                break;
            case SetPlayEnumType.Rezerwa:
                if (!isOwnSquad(play.userData.playerId)) {
                    throw new Error(
                        'Reserve player must belong to the user squad'
                    );
                }
                break;
            case SetPlayEnumType.RezerwaGielda:
                if (
                    !ownAssignment ||
                    playersById.get(play.userData.playerId)?.[ownAssignment] !=
                        null
                ) {
                    throw new Error(
                        'Market reserve player must be undrafted in the user draft pool'
                    );
                }
                break;
            case SetPlayEnumType.Spartacus:
                if (lineup.roundNumber < 2) {
                    throw new Error('Spartacus is available from round two');
                }
                if (
                    !isOwnSquad(play.userData.ownPlayerId) ||
                    !isOpponentSquad(play.userData.opponentPlayerId)
                ) {
                    throw new Error(
                        'Spartacus players must belong to the own and scheduled opponent squads'
                    );
                }
                break;
            case SetPlayEnumType.Typer:
                if (!combinedLineupPlayers.includes(play.userData.playerId)) {
                    throw new Error(
                        'Typer player must belong to either starting lineup'
                    );
                }
                break;
            case SetPlayEnumType.Awatar:
                if (isOpponentSquad(play.userData.playerId)) {
                    throw new Error(
                        'Avatar player must not belong to the opponent squad'
                    );
                }
                break;
            case SetPlayEnumType.BrudnaPala:
                if (
                    play.userData.leaderIdList.some(
                        id => playersById.get(id)?.playerStatus !== 'active'
                    )
                ) {
                    throw new Error('Leaders must be active players');
                }
                break;
        }
    }
}

export async function validateSetPlayResults(
    play: SetPlaysDataSelectionReturnType,
    results: SetPlayAdminDataType,
    lineup: StartingLineupType
) {
    if ('playerIdList' in results) {
        const existing = await PlayersModel.countDocuments({
            _id: { $in: results.playerIdList }
        }).exec();
        if (existing !== results.playerIdList.length) {
            throw new Error('Invalid result playerId');
        }
        if (
            play.type === SetPlayEnumType.Remis &&
            results.playerIdList.some(
                id => !getStartingLineupPlayerIds(lineup).includes(id)
            )
        ) {
            throw new Error(
                'Draw results must refer to starting-lineup players'
            );
        }
    }
    if (play.type === SetPlayEnumType.BrudnaPala && 'leaders' in results) {
        const ids = results.leaders.map(leader => leader.playerId);
        if (
            new Set(ids).size !== 4 ||
            ids.some(id => !play.userData.leaderIdList.includes(id))
        ) {
            throw new Error(
                'Leader results must cover exactly the four selected leaders'
            );
        }
        const existing = await PlayersModel.countDocuments({
            _id: { $in: ids }
        }).exec();
        if (existing !== 4) {
            throw new Error('Invalid result playerId');
        }
    }
    return results;
}

export function getSetPlayIndex(
    plays: SetPlaysDataSelectionReturnType[],
    playId: string
) {
    const id = objectIdSchema.unwrap().parse(playId).toLowerCase();
    const index = plays.findIndex(play => play.playId === id);
    if (index === -1) {
        throw new Error(`Invalid playId for starting lineup: ${id}`);
    }
    return index;
}

export function validateSetPlayConstraints(
    setPlayList: Pick<SetPlayPayloadType, 'type'>[]
): SetPlayEnumType[] {
    if (setPlayList.length >= MAX_SET_PLAYS_PER_ROUND) {
        return [];
    }

    return Object.values(SetPlayEnumType).filter(type => {
        const count = setPlayList.filter(play => play.type === type).length;
        return count < getSetPlaySelectionLimit(type);
    });
}

export function validateSetPlays(
    plays: Pick<SetPlayPayloadType, 'type'>[],
    context: z.RefinementCtx
) {
    const counts = new Map<SetPlayEnumType, number>();
    plays.forEach((play, index) => {
        const count = (counts.get(play.type) ?? 0) + 1;
        counts.set(play.type, count);
        const maximum = getSetPlaySelectionLimit(play.type);
        if (count > maximum) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: [index, 'type'],
                message: `${play.type} may be selected at most ${maximum} time(s) per round`
            });
        }
    });
}

export function validateSetPlaySelectionFields(
    selection: SetPlaySelectionType,
    allowPlayId = true
) {
    if (
        !selection ||
        typeof selection !== 'object' ||
        Array.isArray(selection)
    ) {
        throw new Error('Invalid set play selection');
    }
    if (!allowPlayId && 'playId' in selection) {
        throw new Error(
            'Supply playId as the edit target, not in the user payload'
        );
    }
    if ('adminData' in selection) {
        throw new Error('Use the result operation to submit admin data');
    }
    if ('name' in selection || 'type' in selection) {
        throw new Error('Select a catalog entry using setPlayId');
    }
}
