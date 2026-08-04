import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import { HistoryTeamType } from '@/db/models/history/history-team';
import { PlayersType } from '@/db/models/players';
import { historyTeamSchema } from '@/db/models/schema.types';

//HistoryGames collection represent in each document game played in megaliga
// We will identify all games for given team in given season by finding all documents by teamId and season in historyGames collection

export const historyGamesScoreDetailsZodSchema = z.object({
    teamOne: historyTeamSchema,
    teamTwo: historyTeamSchema
});

export type HistoryGamesScoreDetailsType = z.infer<
    typeof historyGamesScoreDetailsZodSchema
>;

type PopulatedHistoryScoreDetailsPlayerType = Omit<
    NonNullable<HistoryGamesScoreDetailsType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type HistoryScoreDetailsTeamPlayerReturnType = Omit<
    PopulatedHistoryScoreDetailsPlayerType,
    'playerId'
> & {
    extraligaPlayerName: PlayersType['extraligaPlayerName'];
};

type PopulatedHistoryGamesScoreDetailsType = Omit<
    HistoryGamesScoreDetailsType,
    'teamOne' | 'teamTwo'
> & {
    teamOne: Omit<
        HistoryGamesScoreDetailsType['teamOne'],
        'teamId' | 'players'
    > & {
        teamId: Pick<HistoryTeamType, 'name'>;
        players: PopulatedHistoryScoreDetailsPlayerType[];
    };
    teamTwo: Omit<
        HistoryGamesScoreDetailsType['teamTwo'],
        'teamId' | 'players'
    > & {
        teamId: Pick<HistoryTeamType, 'name'>;
        players: PopulatedHistoryScoreDetailsPlayerType[];
    };
};

type HistoryScoreDetailsTeamReturnType = {
    teamName: HistoryTeamType['name'];
    players: HistoryScoreDetailsTeamPlayerReturnType[];
    score: HistoryGamesScoreDetailsType['teamOne']['score'];
    trainer: PopulatedHistoryGamesScoreDetailsType['teamOne']['trainer'];
    setPlays: HistoryGamesScoreDetailsType['teamOne']['setPlays'];
};
export interface HistoryGamesScoreDetailsByIdReturnType {
    teamOne: HistoryScoreDetailsTeamReturnType;
    teamTwo: HistoryScoreDetailsTeamReturnType;
}

export type PopulatedFindType =
    HydratedDocument<PopulatedHistoryGamesScoreDetailsType>;

interface HistoryGamesScoreDetailsModelType extends Model<HistoryGamesScoreDetailsType> {
    getHistoryScoreDetailsById: (
        id: string
    ) => Promise<HistoryGamesScoreDetailsByIdReturnType>;
}

const historyGamesScoreDetails = new Schema<
    HistoryGamesScoreDetailsType,
    HistoryGamesScoreDetailsModelType
>({
    teamOne: {
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'HistoryTeam',
            required: true
        },
        score: { type: Number },
        setPlays: [{ type: String }],
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: { type: Number },
                heatTwo: { type: Number },
                heatThree: { type: Number },
                heatFour: { type: Number },
                heatFive: { type: Number },
                heatSix: { type: Number },
                heatSeven: { type: Number },
                setPlay: { type: Number },
                comment: { type: String }
            }
        ],
        trainer: {
            heatOne: { type: Number },
            heatTwo: { type: Number },
            heatThree: { type: Number },
            heatFour: { type: Number },
            heatFive: { type: Number },
            heatSix: { type: Number },
            heatSeven: { type: Number },
            setPlay: { type: Number },
            comment: { type: String }
        }
    },
    teamTwo: {
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'HistoryTeam',
            required: true
        },
        score: { type: Number },
        setPlays: [{ type: String }],
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: { type: Number },
                heatTwo: { type: Number },
                heatThree: { type: Number },
                heatFour: { type: Number },
                heatFive: { type: Number },
                heatSix: { type: Number },
                heatSeven: { type: Number },
                setPlay: { type: Number },
                comment: { type: String }
            }
        ],
        trainer: {
            heatOne: { type: Number },
            heatTwo: { type: Number },
            heatThree: { type: Number },
            heatFour: { type: Number },
            heatFive: { type: Number },
            heatSix: { type: Number },
            heatSeven: { type: Number },
            setPlay: { type: Number },
            comment: { type: String }
        }
    }
});

historyGamesScoreDetails.static(
    'getHistoryScoreDetailsById',
    async function getHistoryScoreDetailsById(id: string) {
        try {
            const isValidId = await HistoryGamesScoreDetailsModel.exists({
                _id: id
            });
            if (!isValidId) {
                throw new Error(`Invalid id: ${id}`);
            }

            const scoreDetailsDocument = (await this.findById(id)
                .populate({ path: 'teamOne.teamId', select: 'name' })
                .populate({ path: 'teamTwo.teamId', select: 'name' })
                .populate({
                    path: 'teamOne.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate({
                    path: 'teamTwo.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .exec()) as PopulatedFindType | null;

            if (!scoreDetailsDocument) {
                throw new Error(`Score details not found for id: ${id}`);
            }

            const mapTeam = (
                team: PopulatedHistoryGamesScoreDetailsType['teamOne']
            ): HistoryScoreDetailsTeamReturnType => {
                return {
                    teamName: team?.teamId.name ?? '',
                    score: team.score,
                    players: (team.players ?? []).map(player => {
                        return {
                            heatOne: player.heatOne,
                            heatTwo: player.heatTwo,
                            heatThree: player.heatThree,
                            heatFour: player.heatFour,
                            heatFive: player.heatFive,
                            heatSix: player.heatSix,
                            heatSeven: player.heatSeven,
                            setPlay: player.setPlay,
                            comment: player.comment,
                            extraligaPlayerName:
                                player.playerId?.extraligaPlayerName ?? ''
                        };
                    }),
                    trainer: team.trainer,
                    setPlays: team?.setPlays
                };
            };

            return {
                teamOne: mapTeam(scoreDetailsDocument.teamOne),
                teamTwo: mapTeam(scoreDetailsDocument.teamTwo)
            };
        } catch (error) {
            console.error('Error fetching history score details by id:', error);
            throw error;
        }
    }
);

const HistoryGamesScoreDetailsModel = model<
    HistoryGamesScoreDetailsType,
    HistoryGamesScoreDetailsModelType
>('HistoryGamesScoreDetails', historyGamesScoreDetails);

export default HistoryGamesScoreDetailsModel;
