import { injectable, inject } from 'inversify';
import { PresenceRequest, PresenceData } from '../api/model/Presence';
import * as _ from 'lodash';
import { ExternalPresenceService } from './ExternalPresenceService';
import Logger from 'bunyan';
import { UserService } from '../user/UserService';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { LocationService } from '../location/LocationService';
import { DeviceService } from '../device/DeviceService';
import NotFoundError from '../api/error/NotFoundError';
import { LocationFilters, PropExpand } from '../api';

@injectable()
class PresenceService implements ExternalPresenceService {
  constructor(
    @inject('ExternalPresenceService') private readonly externalPresenceService: ExternalPresenceService,
    @inject('Logger') private readonly logger: Logger,
    @inject('UserService') private readonly userService: UserService,
    @inject('LocationService') private locationService: LocationService,
    @inject('DeviceService') private deviceService: DeviceService,
  ) {}

  public async getNow(): Promise<any> {
    return this.externalPresenceService.getNow();
  }

  public async getHistory(): Promise<any> {
    return this.externalPresenceService.getHistory();
  }

  public async getByUserId(userId: string): Promise<any> {
    return this.externalPresenceService.getByUserId(userId);
  }

  public async formatPresenceData(payload: PresenceRequest, ipAddress: string, userId: string, clientId: string): Promise<PresenceData> {
    // TODO: If cheap, resolve the accountId and list of devices (mac address)
    // that this user has access to at the time of the presence call
    const mayBeUserData = await this.userService.getUserById(userId, {
      $select: {
        account: {
          $select: {
            type: true
          }
        }
      }
    });
    const accountType = pipe(mayBeUserData, Option.map(({ account }) => account.type), Option.toUndefined);
    return {
      ipAddress,
      userId,
      action: 'report',
      type: 'user',
      appName: payload.appName === undefined || payload.appName === '' ? clientId : payload.appName,
      appVersion: payload.appVersion,
      accountId: undefined,
      deviceId: undefined,
      locationIds: payload.locationIds,
      deviceIds: payload.deviceIds,
      userData: { account: { type: accountType || 'personal' }}
    };
  }

  public async report(presenceData: PresenceData): Promise<PresenceData> {

    // A client can't do anything if there is an error, log it, alert us, leave client alone
    try
    {
      return this.externalPresenceService.report(presenceData);
    }
    catch (err) {
      this.logger.error({ err });
      return presenceData;
    }
  }
}

export default PresenceService;