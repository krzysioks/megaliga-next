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
