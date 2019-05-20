import { injectable, inject } from 'inversify';
import Config from '../../config/config';
import {PresenceData} from "../api/model/Presence";

@injectable()
class PresenceService {
    constructor(
        @inject('Config') private readonly config: typeof Config
    ) {}

    public report(payload: PresenceData, ipAddress: string, userId: string, appName: string): PresenceData {
        // Set default values
        payload.action = "report";
        payload.date = new Date().toISOString();
        payload.ipAddress = ipAddress;
        payload.userId = userId;
        payload.type = "user";

        // Resolve the account id and devices to help consumers
        payload.accountId = "";
        payload.deviceId = [];

        // Ensure TTL is within a valid range ( 60 seconds - 1 hour )
        if (payload.ttl < 60) {
            payload.ttl = 60
        }
        if (payload.ttl > 3600) {
            payload.ttl = 3600
        }

        // Set the appName to provided value if not already set in payload
        if (payload.appName === "" || payload.appName === undefined) {
            payload.appName = appName;
        }

        this.postToKafka(payload);
        this.addToRedis(payload);

        return payload;
    }

    public postToKafka(payload: PresenceData): void {
        // TODO: Post the payload to Kafka topic "presence-activity-v1"
    }

    public addToRedis(payload: PresenceData): void {
        // TODO: Write data to Redis

        // Redis Format
        // HashSet
        // Key = presence.user.{id}
        // Expire based on TTL in the payload ( ttl is seconds )
        // Property: {appname}+{appversion}, Value: JSON of the payload
    }
}

export default PresenceService;