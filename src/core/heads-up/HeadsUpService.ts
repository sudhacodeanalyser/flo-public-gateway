import { injectable, inject } from 'inversify';
import { DeviceService, LocalizationService } from '../service';
import NotFoundError from '../api/error/NotFoundError';
import * as O from 'fp-ts/lib/Option';
import { Subscription, User } from '../api';
import moment from 'moment-timezone';
import { EmailGatewayService } from '../../email/EmailGatewayService';
import { DeviceUpdate } from './model';

@injectable()
class HeadsUpService {
  constructor(
    @inject('DeviceService') private deviceService: DeviceService,
    @inject('LocalizationService') private localizationService: LocalizationService,
    @inject('EmailGatewayService') private emailGatewayService: EmailGatewayService
  ) {}

  public async handleDeviceUpdate(deviceUpdate: DeviceUpdate): Promise<void> {
    if (
      deviceUpdate.changeRequest.fwProperties.ht_times_per_day === 0 &&
      deviceUpdate.prevDeviceInfo?.properties?.ht_times_per_day !== 0
    ) {
      await this.triggerAutoHealthTestDisabledEmail(deviceUpdate.macAddress);
    }
  }

  public async triggerAutoHealthTestDisabledEmail(macAddress: string): Promise<void> {
    const device = O.toNullable(await this.deviceService.getByMacAddress(macAddress, {
      $select: {
        nickname: true,
        location: {
          $select: {
            nickname: true,
            timezone: true,
            subscription: true,
            users: {
              $select: {
                email: true,
                firstName: true,
                lastName: true,
                locale: true
              }
            }
          }
        }
      }
    }));
    
    if (!device) {
      throw new NotFoundError('Device not found.');
    }

    const hasSubscription = !!(device.location.subscription as Subscription)?.provider?.isActive;
    const users = device.location.users as Array<Pick<User, 'email' | 'firstName' | 'lastName' | 'locale'>>;
    const localizedAssetName = `user.auto_health_test_disabled.template.${ hasSubscription ? 'subscriber' : 'nonsubscriber' }`;
    await Promise.all(
      (users || []).map(async user => {

        if (!user.email) {
          return;
        }

        const { items: [{ value: templateId }]} = await this.localizationService
          .getAssets({ 
            name: localizedAssetName, 
            type: 'email', 
            locale: user.locale
          });
        const emailData = {
          firstName: user.firstName,
          lastName: user.lastName,
          deviceName: device.nickname,
          locationName: device.location.nickname,
          dateTime: moment.tz(device.location.timezone || 'Etc/UTC').format()
        };

        await this.emailGatewayService.queue(user.email, templateId, emailData);
      })
    );
  }
}

export { HeadsUpService };