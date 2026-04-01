import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    standardStringSchema,
    statusEnumSchema
} from '@/db/models/schema.types';

// Notification model is used to store notifications, that will be displayed in sidewide banner
const STATUS_ENUM = statusEnumSchema._def.values;

export const notificationsZodSchema = z.object({
    message: standardStringSchema,
    status: statusEnumSchema.default('inactive'),
    isDissmissible: z.boolean(), // defines if x button to close notification will be displayed
    dismissedUserIds: z.array(objectIdSchema).default([]).optional() // list of user IDs who dismissed this notification
});

export type NotificationsType = z.infer<typeof notificationsZodSchema>;

const notificationsSchema = new Schema<NotificationsType>({
    message: { type: String, required: true },
    status: {
        type: String,
        enum: STATUS_ENUM,
        default: 'inactive',
        required: true
    },
    isDissmissible: { type: Boolean, required: true },
    dismissedUserIds: { type: [Types.ObjectId], ref: 'User', default: [] }
});

const NotificationsModel = model<NotificationsType>(
    'Notifications',
    notificationsSchema
);

export default NotificationsModel;
