export enum ResourceEventAction {
    CREATED = 'created',
    UPDATED = 'updated',
    DELETED = 'deleted',
}

export enum ResourceEventType {
    DEVICE = 'device',
    LOCATION = 'location',
    ACCOUNT = 'account',
    USER = 'user',
}

export interface ResourceEventInfo {
    userId: string;
    ipAddress: string;
    clientId: string;
    userAgent: string;
    eventData?: any;
}

export interface ItemEvent{
    resourceName: string;
    resourceId: string;
    eventData?: any;
}

export interface ResourceEvent {
    created: string;
    accountId: string;
    resourceType: ResourceEventType;
    resourceAction: ResourceEventAction;
    resourceName: string;
    resourceId: string;
    userId: string;
    userName: string;
    ipAddress?: string;
    clientId?: string;
    userAgent?: string;
    eventData?: any;
}
