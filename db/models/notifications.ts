import { HydratedDocument, Model, model, Schema, Types } from 'mongoose';
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
    dismissedUserIds: z.array(objectIdSchema).default([]) // list of user IDs who dismissed this notification
});

export type NotificationsType = z.infer<typeof notificationsZodSchema>;

interface NotificationsMethodsType {
    setIsDismissed: (userId: string) => Promise<void>;
}

// when no static methods added -> we define NotificationsModelType as type. Once static methods will be added we will change it to the interface (look at commented code below)
// type NotificationsModelType = Model<
//     NotificationsType,
//     '',
//     NotificationsMethodsType
// >;

type NotificationsDocumentType = Promise<HydratedDocument<NotificationsType>[]>;

interface NotificationsModelType extends Model<
    NotificationsType,
    '',
    NotificationsMethodsType
> {
    getAllActiveNotifications: (userId: string) => NotificationsDocumentType;
}

export type FindByIdType = HydratedDocument<
    NotificationsType,
    NotificationsMethodsType
> | null;

const notificationsSchema = new Schema<
    NotificationsType,
    NotificationsModelType,
    NotificationsMethodsType
>({
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

notificationsSchema.static(
    'getAllActiveNotifications',
    function getAllActiveNotifications(userId: string) {
        try {
            const notifications = this.find({
                status: 'active',
                dismissedUserIds: { $nin: [userId] }
            });

            return notifications;
        } catch (error) {
            console.error('Error fetching active notifications:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

notificationsSchema.method(
    'setIsDismissed',
    async function setIsDismissed(userId: string): Promise<void> {
        if (!this.isDissmissible) {
            throw new Error('Notification is not dismissible');
        }

        const uniqueUserIds = new Set(this.dismissedUserIds);

        if (!uniqueUserIds.has(userId)) {
            uniqueUserIds.add(userId);
            this.dismissedUserIds = Array.from(uniqueUserIds);
            try {
                await this.save();
            } catch (error) {
                console.error(
                    'Error saving notification after setting isDismissed:',
                    error
                );
                // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
                throw error;
            }
        }
    }
);

// save notfication document - will be triggered directly on NotificationsModel in place of invocation. const contification = new NotificationsModel({ message: 'New notification', status: 'active', isDissmissible: true }); await notification.save();

const NotificationsModel = model<NotificationsType, NotificationsModelType>(
    'Notifications',
    notificationsSchema
);

export default NotificationsModel;
