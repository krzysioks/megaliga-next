import type {
    GetSetPlaysDetailsParamsType,
    GetSetPlaysDetailsReturnType,
    MatchPairType
} from '@/db/db.types';
import type {
    SetPlayAdminDataType,
    SetPlayUserDataType
} from '@/db/models/games/set-plays-data';

import {
    MAX_SELECTIONS_PER_SET_PLAY,
    MAX_SELECTIONS_PER_RESERVE_SET_PLAY
} from '@/db/db.constants';
import PlayersModel from '@/db/models/players';
import { SetPlayEnumType } from '@/db/models/schema.types';
import { formatSetPlaysComment } from '@/utils/utils';

// single round-robin schedule for a group of teams, using the berger table algorithm
export function generateBergerTableRounds(
    teamIds: string[]
): MatchPairType[][] {
    const numberOfTeams = teamIds.length;
    const numberOfRounds = numberOfTeams - 1;
    const matchesPerRound = numberOfTeams / 2;

    const rounds: MatchPairType[][] = [];

    for (let round = 0; round < numberOfRounds; round++) {
        const roundMatches: MatchPairType[] = [];

        for (let match = 0; match < matchesPerRound; match++) {
            const homeIndex = (round + match) % numberOfRounds;
            let awayIndex = (numberOfRounds - match + round) % numberOfRounds;

            if (match === 0) {
                awayIndex = numberOfRounds;
            }

            roundMatches.push([
                teamIds[homeIndex] as string,
                teamIds[awayIndex] as string
            ]);
        }

        rounds.push(roundMatches);
    }

    return rounds;
}

// rotates group2 against group1 so each team from group1 faces a different group2 team each round, without repeating opponents
export function generateInterGroupRounds(
    group1TeamIds: string[],
    group2TeamIds: string[],
    numberOfRounds: number
): MatchPairType[][] {
    const numberOfTeams = group1TeamIds.length;
    const rounds: MatchPairType[][] = [];

    for (let round = 0; round < numberOfRounds; round++) {
        const roundMatches: MatchPairType[] = [];

        for (let i = 0; i < numberOfTeams; i++) {
            const homeIndex = (i + round) % numberOfTeams;
            roundMatches.push([
                group1TeamIds[homeIndex] as string,
                group2TeamIds[i] as string
            ]);
        }

        rounds.push(roundMatches);
    }

    return rounds;
}

export function getSetPlaySelectionLimit(type: SetPlayEnumType) {
    return [SetPlayEnumType.Rezerwa, SetPlayEnumType.RezerwaGielda].includes(
        type
    )
        ? MAX_SELECTIONS_PER_RESERVE_SET_PLAY
        : MAX_SELECTIONS_PER_SET_PLAY;
}

export async function getSetPlaysDetails(
    params: GetSetPlaysDetailsParamsType
): Promise<GetSetPlaysDetailsReturnType> {
    const roles = params.roles
        ? {
              pn: {
                  playerId: params.roles.pn.playerId.toString(),
                  isDisabled: params.roles.pn.isDisabled
              },
              kb: params.roles.kb.toString(),
              p: params.roles.p.toString()
          }
        : null;
    const setPlays: GetSetPlaysDetailsReturnType['setPlays'] =
        params.setPlayList.map(setPlay => {
            return {
                name: setPlay.name,
                type: setPlay.type,
                userData: 'userData' in setPlay ? setPlay.userData : null
            };
        });
    const playerIds = new Set<string>(
        roles ? [roles.pn.playerId, roles.kb, roles.p] : []
    );
    for (const setPlay of setPlays) {
        const userData = setPlay.userData;
        if (!userData) {
            continue;
        }
        if ('playerId' in userData) {
            playerIds.add(userData.playerId);
        }
        if ('replacedPlayerId' in userData) {
            playerIds.add(userData.replacedPlayerId);
        }
        if ('ownPlayerId' in userData) {
            playerIds.add(userData.ownPlayerId);
            playerIds.add(userData.opponentPlayerId);
        }
        if ('leaderIdList' in userData) {
            userData.leaderIdList.forEach(playerId => {
                playerIds.add(playerId);
            });
        }
    }
    const referencedPlayers = playerIds.size
        ? await PlayersModel.find({ _id: { $in: [...playerIds] } })
              .select('_id extraligaPlayerName')
              .exec()
        : [];
    const setPlayPlayers = referencedPlayers.map(player => {
        return {
            playerId: player._id.toString(),
            extraligaPlayerName: player.extraligaPlayerName
        };
    });

    return {
        roles,
        setPlayPlayers,
        setPlays,
        setPlayDescriptions: formatSetPlaysComment({
            roles,
            setPlays,
            players: setPlayPlayers
        })
    };
}

export function normalizeSetPlayData<
    T extends
        | SetPlayUserDataType
        | Exclude<SetPlayAdminDataType, Record<string, boolean>>
>(data: T): T {
    const references:
        | SetPlayUserDataType
        | Exclude<SetPlayAdminDataType, Record<string, boolean>> = data;
    if ('playerResults' in references) {
        return {
            ...data,
            playerResults: Object.fromEntries(
                Object.entries(references.playerResults).map(
                    ([playerId, isSelected]) => {
                        return [playerId.toLowerCase(), isSelected];
                    }
                )
            )
        };
    }
    if ('replacedPlayerId' in references) {
        return {
            ...data,
            playerId: references.playerId.toLowerCase(),
            replacedPlayerId: references.replacedPlayerId.toLowerCase()
        };
    }
    if ('playerId' in references) {
        return { ...data, playerId: references.playerId.toLowerCase() };
    }
    if ('ownPlayerId' in references) {
        return {
            ...data,
            ownPlayerId: references.ownPlayerId.toLowerCase(),
            opponentPlayerId: references.opponentPlayerId.toLowerCase()
        };
    }
    if ('leaderIdList' in references) {
        return {
            ...data,
            leaderIdList: references.leaderIdList.map(id => id.toLowerCase())
        };
    }
    if ('playerIdList' in references) {
        return {
            ...data,
            playerIdList: references.playerIdList.map(id => id.toLowerCase())
        };
    }
    return data;
}
