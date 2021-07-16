import { injectable, inject } from 'inversify';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import {
  Expandable,
  Device as DeviceModel,
  Location as LocationModel,
  User as UserModel,
  DependencyFactoryFactory,
} from '../api';
import Logger from 'bunyan';
import { memoized, MemoizeMixin } from '../../memoize/MemoizeMixin';
import { UserService } from '../service';
import { Device, Location, User } from '../api/response';
import { HttpService, HttpError } from '../../http/HttpService';
import {
  ItemEvent,
  ResourceEventAction,
  ResourceEventInfo,
  ResourceEvent,
  ResourceEventType,
} from '../api/model/ResourceEvent';
import { isNone } from 'fp-ts/lib/Option';

@injectable()
class ResourceEventService extends MemoizeMixin(HttpService) {
  private userServiceFactory: () => UserService;

  constructor(
    @inject('ResourceEventKafkaTopic')
    private readonly resourceEventKafkaTopic: string,
    @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer,
    @inject('Logger') private readonly logger: Logger,
    @inject('DependencyFactoryFactory')
    depFactoryFactory: DependencyFactoryFactory,
    @inject('ResourceEventApiUrl') private resourceEventApiUrl: string
  ) {
    super();
    this.userServiceFactory = depFactoryFactory('UserService');
  }

  public async getResourceEvents(
    accountId: string,
    from: string,
    to: string
  ): Promise<ResourceEvent[]> {
    const request = {
      method: 'get',
      url: `${
        this.resourceEventApiUrl
      }/event?accountId=${accountId}&from=${from}&to=${to}`,
    };

    const response = await this.sendRequest(request);

    return response;
  }

  public async publishResourceEvent<T>(
    type: ResourceEventType,
    action: ResourceEventAction,
    item: Expandable<T>,
    resourceEventInfo: ResourceEventInfo
  ): Promise<void> {
    try {
      const user = await this.userServiceFactory().getUserById(
        resourceEventInfo.userId,
        {
          $select: {
            email: true,
            account: { $select: { id: true } },
          },
        }
      );

      let accountId = '';
      let userName = '';

      if (!isNone(user)) {
        userName = user.value.email || '';
        accountId = user.value.account.id || '';
      } 
      
      if (userName === '') {
        userName = resourceEventInfo.userId;
      }

      if (accountId === '') {
        accountId = resourceEventInfo.userId;
      }

      const message = this.formatResourceEventMessage(
        type,
        action,
        item,
        resourceEventInfo,
        accountId,
        userName
      );

      await this.kafkaProducer.send(this.resourceEventKafkaTopic, message);
    } catch (err) {
      this.logger.error({ err });
    }
  }

  private formatResourceEventMessage<T>(
    type: ResourceEventType,
    action: ResourceEventAction,
    itemData: Expandable<T>,
    resourceEventInfo: ResourceEventInfo,
    accountId: string,
    userName: string
  ): ResourceEvent {
    const item = this.mapItem(type, itemData, resourceEventInfo.eventData);

    return {
      created: new Date().toISOString(),
      accountId,
      resourceType: type,
      resourceAction: action,
      resourceName: item.resourceName,
      resourceId: item.resourceId,
      userId: resourceEventInfo.userId,
      userName,
      ipAddress: resourceEventInfo.ipAddress,
      clientId: resourceEventInfo.clientId,
      userAgent: resourceEventInfo.userAgent,
      eventData: item.eventData,
    };
  }

  private mapItem(
    type: ResourceEventType,
    itemData: any,
    eventData: any
  ): ItemEvent {
    switch (type) {
      case ResourceEventType.DEVICE:
        const { id: deviceId, nickname: deviceNickname } = Device.fromModel(
          itemData as DeviceModel
        );

        return {
          resourceId: deviceId,
          resourceName: deviceNickname || '',
          eventData: eventData || {},
        };
      case ResourceEventType.LOCATION:
        const {
          id: locationId,
          nickname: locationNickname,
        } = Location.fromModel(itemData as LocationModel);

        return {
          resourceId: locationId,
          resourceName: locationNickname || '',
          eventData: eventData || {},
        };
      case ResourceEventType.USER:
        const { id: userId, email: email } = itemData;

        return {
          resourceId: userId,
          resourceName: email || '',
          eventData: eventData || {},
        };
      default:
        return {
          resourceId: '',
          resourceName: '',
          eventData: {},
        };
    }
  }
}

export { ResourceEventService };
