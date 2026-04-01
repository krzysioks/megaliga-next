import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    standardStringSchema,
    actionCentreNotificationStatusSchema,
    actionCentreNotificationTypeSchema
} from '@/db/models/schema.types';

// ActionCenterNotification model is used to store user specific notifications, that will inform user of action required from him. They will be used in Dashboard -> Centrum Akcji
const TYPE_ENUM = actionCentreNotificationTypeSchema._def.values;
const STATUS_ENUM = actionCentreNotificationStatusSchema._def.values;

export const actionCentreNotificationsZodSchema = z.object({
    message: standardStringSchema,
    status: actionCentreNotificationStatusSchema.default('new'),
    type: actionCentreNotificationTypeSchema, // type of notification will determine which form will be rendered in action centre
    userId: objectIdSchema // Reference to User model, to whom this notification belongs. Will be used to get name of the user, but also to know to whom send action centre notification
});

export type ActionCentreNotificationsType = z.infer<
    typeof actionCentreNotificationsZodSchema
>;

const actionCentreNotificationsSchema =
    new Schema<ActionCentreNotificationsType>({
        message: { type: String, required: true },
        status: {
            type: String,
            enum: STATUS_ENUM,
            default: 'new',
            required: true
        },
        type: {
            type: String,
            enum: TYPE_ENUM,
            required: true
        },
        userId: { type: Types.ObjectId, ref: 'User', required: true }
    });

const ActionCentreNotificationsModel = model<ActionCentreNotificationsType>(
    'ActionCentreNotifications',
    actionCentreNotificationsSchema
);

export default ActionCentreNotificationsModel;
