import { injectable, inject } from 'inversify';
import { PresenceRequest, PresenceData } from "../api/model/Presence";
import { KafkaProducer } from '../../kafka/KafkaProducer';
import _ from 'lodash';

@injectable()
class PresenceService {
    constructor(
        @inject('PresenceKafkaTopic') private readonly kafkaTopic: string,
        @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer
    ) {}

    public async report(payload: PresenceRequest, ipAddress: string, userId: string, clientId: string): Promise<PresenceData> {
        const presenceData = {
            action: 'report',
            date: new Date().toISOString(),
            ipAddress,
            userId,
            type: 'user',
            ttl: payload.ttl === undefined || payload.ttl < 60 ? 60 : (payload.ttl > 3600 ? 3600 : payload.ttl),
            appName: clientId,
            appVersion: undefined,
            accountId: undefined,
            deviceId: undefined,
            ..._.omitBy(payload, value => _.isEmpty(value))
        };

        await this.postToKafka(presenceData);
        this.addToRedis(presenceData);

        return presenceData;
    }

    public postToKafka(payload: PresenceData): void {

        this.kafkaProducer.send(this.kafkaTopic, payload);
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