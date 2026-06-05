import { HydratedDocument, Model, model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    standardStringSchema,
    actionCentreNotificationStatusSchema,
    actionCentreNotificationTypeSchema
} from '@/db/models/schema.types';

// ActionCenterNotification model is used to store user specific notifications, that will inform user of action required from him. They will be used in Dashboard -> Centrum Akcji
export const TYPE_ENUM = actionCentreNotificationTypeSchema._def.values;
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

interface ActionCentreNotificationsMethodsType {
    setStatus: (userId: string) => Promise<void>;
}

type ActionCentreNotificationsDocumentType = Promise<
    HydratedDocument<ActionCentreNotificationsType>
>;

interface ActionCentreNotificationsModelType extends Model<
    ActionCentreNotificationsType,
    '',
    ActionCentreNotificationsMethodsType
> {
    getAllActionCentreNotificationsByUser: (
        userId: string
    ) => Promise<HydratedDocument<ActionCentreNotificationsType>[]>;
}

export type FindByIdType =
    HydratedDocument<ActionCentreNotificationsType> | null;

const actionCentreNotificationsSchema = new Schema<
    ActionCentreNotificationsType,
    ActionCentreNotificationsModelType,
    ActionCentreNotificationsMethodsType
>({
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

actionCentreNotificationsSchema.static(
    'getAllActionCentreNotificationsByUser',
    async function getAllActionCentreNotificationsByUser(userId: string) {
        try {
            const notifications = await this.find({
                userId
            });

            return notifications;
        } catch (error) {
            console.error('Error fetching action centre notifications:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

actionCentreNotificationsSchema.method(
    'setStatus',
    async function setStatus(
        status: z.infer<typeof actionCentreNotificationStatusSchema>
    ): Promise<void> {
        if (this.status === status || !STATUS_ENUM.includes(status)) {
            return;
        }

        this.status = status;
        try {
            await this.save();
        } catch (error) {
            console.error(
                'Error saving notification after setting status:',
                error
            );
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

// save action centre notfication document - will be triggered directly on ActionCentreNotificationsModel in place of invocation. Check test for details

const ActionCentreNotificationsModel = model<
    ActionCentreNotificationsType,
    ActionCentreNotificationsModelType
>('ActionCentreNotifications', actionCentreNotificationsSchema);

export default ActionCentreNotificationsModel;
