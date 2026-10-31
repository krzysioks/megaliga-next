import type { FormatSetPlaysParamsType } from '@/utils/utils.types';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import {
    PLAYER_ROLE_LABELS,
    SET_PLAY_SHORT_LABELS
} from '@/utils/utils.constants';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatSetPlaysComment(
    params: FormatSetPlaysParamsType
): string {
    const playerNames = new Map(
        params.players.map(player => [
            player.playerId,
            player.extraligaPlayerName
        ])
    );
    const getPlayerName = (playerId: string) => playerNames.get(playerId) ?? '';
    const roleDescriptions = PLAYER_ROLE_LABELS.flatMap(([role, label]) => {
        const playerId = params.roles?.[role];
        return playerId ? [`${label} - ${getPlayerName(playerId)}`] : [];
    });
    const selectedPlayDescriptions = params.setPlays.map(setPlay => {
        const label = SET_PLAY_SHORT_LABELS[setPlay.type] ?? setPlay.name;
        const userData = setPlay.userData;

        if (!userData) {
            return `${label}:`;
        }
        if ('replacedPlayerId' in userData) {
            return `${label}: ${getPlayerName(userData.playerId)} za ${getPlayerName(userData.replacedPlayerId)}`;
        }
        if ('ownPlayerId' in userData) {
            return `${label}: ${getPlayerName(userData.ownPlayerId)} vs ${getPlayerName(userData.opponentPlayerId)}`;
        }
        if ('leaderIdList' in userData) {
            return `${label}: ${userData.leaderIdList.map(getPlayerName).join(', ')}`;
        }
        if ('attemptOne' in userData) {
            const firstTotal = Object.values(userData.attemptOne).reduce(
                (sum, value) => sum + value,
                0
            );
            const secondTotal = Object.values(userData.attemptTwo).reduce(
                (sum, value) => sum + value,
                0
            );
            return `${label}: ${getPlayerName(userData.playerId)} ${firstTotal}/${secondTotal}`;
        }
        if ('minimum' in userData) {
            return `${label}: ${userData.minimum}–${userData.maximum}`;
        }
        return `${label}: ${getPlayerName(userData.playerId)}`;
    });

    return [...roleDescriptions, ...selectedPlayDescriptions].join(', ');
}
