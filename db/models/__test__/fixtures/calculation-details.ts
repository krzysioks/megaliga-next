import type { TeamCalculationDetailsType } from '@/db/models/schema.types';

import { Types } from 'mongoose';

import { STARTING_LINEUP_PLAYER_COUNT } from '@/db/db.constants';
import { SetPlayEnumType } from '@/db/models/schema.types';

export function createCalculationDetails(): TeamCalculationDetailsType {
    const playerIds = Array.from(
        { length: STARTING_LINEUP_PLAYER_COUNT },
        () => {
            return new Types.ObjectId().toString();
        }
    );
    const nominalPlayerId = new Types.ObjectId().toString();

    return {
        players: playerIds.map((playerId, index) => {
            return {
                playerId,
                nominalPlayerId: index === 0 ? nominalPlayerId : playerId,
                actualStartCount: index === 0 ? 4 : 0,
                basePoints: index === 0 ? 9 : 0,
                functionPoints: index === 0 ? 2 : 0,
                rolePoints: index === 0 ? 1 : 0,
                setPlayPoints: index === 0 ? -2 : 0,
                function: index === 0 ? 'Lider' : null,
                role: index === 0 ? 'PN' : null
            };
        }),
        trainer: { heatPoints: 3, setPlayPoints: 4 },
        setPlayResults: [
            {
                selectedSetPlayId: new Types.ObjectId().toString(),
                setPlayId: new Types.ObjectId().toString(),
                name: 'NCD6',
                type: SetPlayEnumType.Ncd6,
                recipients: [
                    {
                        recipientType: 'player',
                        playerId: playerIds[0],
                        nominalPlayerId,
                        calculatedPoints: -2,
                        creditedPoints: -2,
                        setPlayContributionType: 'award'
                    }
                ]
            }
        ],
        floorAdjustment: 0
    };
}
