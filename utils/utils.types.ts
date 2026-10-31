import type { SetPlaysDataForUserReturnType } from '@/db/models/games/set-plays-data';
import type { StartingLineupType } from '@/db/models/games/starting-lineup';
import type { PlayersReturnType } from '@/db/models/players';

export interface FormatSetPlaysParamsType {
    roles?: StartingLineupType['roles'] | null;
    setPlays: Pick<
        SetPlaysDataForUserReturnType,
        'name' | 'type' | 'userData'
    >[];
    players: Pick<PlayersReturnType, 'playerId' | 'extraligaPlayerName'>[];
}
