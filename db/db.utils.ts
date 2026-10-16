import type {
    SelectedSetPlayType,
    SetPlayAdminDataType,
    SetPlaySelectionType,
    SetPlayUserDataType,
    SetPlaysDataDocumentType,
    PopulatedSetPlaysDataType
} from '@/db/models/games/set-plays-data';
import type { StartingLineupType } from '@/db/models/games/starting-lineup';
import type { HydratedDocument } from 'mongoose';

export type MatchPairType = [userOneId: string, userTwoId: string];

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

export async function getSelectedSetPlays(
    document: HydratedDocument<SetPlaysDataDocumentType>
): Promise<SelectedSetPlayType[]> {
    const populated = await document.populate<
        Pick<PopulatedSetPlaysDataType, 'setPlayList'>
    >({ path: 'setPlayList.setPlayId', select: 'name type' });
    // flattenObjectIds makes all nested references suitable for the public string-ID contract.
    return populated
        .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
        .setPlayList.map(({ _id, setPlayId, ...play }) => {
            if (!setPlayId) {
                throw new Error('Missing catalog entry for selected set play');
            }
            return {
                ...play,
                setPlayId: setPlayId._id.toString(),
                name: setPlayId.name,
                type: setPlayId.type,
                playId: _id.toString()
            } as SelectedSetPlayType;
        });
}

export function getSetPlaySelections(
    plays: SelectedSetPlayType[]
): SetPlaySelectionType[] {
    return plays.map(({ playId, setPlayId, ...play }) => {
        return {
            playId,
            setPlayId,
            ...('userData' in play ? { userData: play.userData } : {})
        };
    });
}

export function getStartingLineupPlayerIds(lineup: StartingLineupType) {
    return [
        lineup.playerOne,
        lineup.playerTwo,
        lineup.playerThree,
        lineup.playerFour,
        lineup.playerFive
    ].map(id => id?.toString());
}

export function normalizeSetPlayData<
    T extends SetPlayUserDataType | SetPlayAdminDataType
>(data: T): T {
    const references: SetPlayUserDataType | SetPlayAdminDataType = data;
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
    if ('leaders' in references) {
        return {
            ...data,
            leaders: references.leaders.map(leader => {
                return {
                    ...leader,
                    playerId: leader.playerId.toLowerCase()
                };
            })
        };
    }
    return data;
}
