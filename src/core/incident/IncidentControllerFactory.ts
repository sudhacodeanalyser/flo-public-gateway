import * as O from 'fp-ts/lib/Option';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpGet, httpPost, interfaces, request, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import * as _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationError from '../../validation/ReqValidationError';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AlarmEvent, AlarmEventFilter, PaginatedResult } from '../api';
import { httpController } from '../api/controllerUtils';
import { convertToLocalTimeWithOffset } from '../api/dateUtils';
import Request from '../api/Request';
import { NotificationService } from '../notification/NotificationService';
import { AlertService, UserService } from '../service';


export function IncidentControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/incidents')
  class EventController extends BaseHttpController {
    constructor(
      @inject('NotificationService') private notificationService: NotificationService,
      @inject('AlertService') private alertService: AlertService,
      @inject('UserService') private userService: UserService,
    ) {
      super();
    }

    @httpPost('/raw', auth)
    private async createIncidentRaw(@request() req: Request, @requestBody() incidentInfo: any): Promise<string> {
      return this
        .notificationService
        .sendAlarm(incidentInfo);
    }

    @httpGet('/',
      auth
    )
    private async getIncidentByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {      
      if (_.isEmpty(req.query.deviceId) && _.isEmpty(req.query.locationId) && _.isEmpty(req.query.userId)) {
        throw new ReqValidationError('Missing deviceId, locationId or userId parameters.');
      }

      const defaultLang = 'en-us';
      
      const retrieveUser = async (id: string) => {
        const propExpand =  { 
          $select: { 
            locations: { 
              $expand: true
            } 
          } 
        };
        return this.userService.getUserById(id,  propExpand);
      };

      const user = req.query.userId ? O.toUndefined(await retrieveUser(req.query.userId.toString())) : undefined;
      const lang = req.query.lang?.toString() || defaultLang;

      const queryDeviceIds = req.query.deviceId ?
        _.concat([], req.query.deviceId)
        : [];

      const userDeviceIds = user ?
        _.flatMap(user.locations, l => l.devices ? l.devices.map(d => d.id) : [])
        : [];

      const deviceIds = _.concat(queryDeviceIds, userDeviceIds);
      const locationId = _.concat([], req.query.locationId || []);
      const status = _.concat([], req.query.status || []);
      const severity = _.concat([], req.query.severity || []);
      const reason = _.concat([], req.query.reason || []);

      const filters = {
        ...req.query,
        ...{lang},// TODO:caution: code fix may change behavior
        ...(!_.isEmpty(deviceIds) && { deviceId: deviceIds }),
        ...(!_.isEmpty(locationId) && { locationId }),
        ...(!_.isEmpty(status) && { status }),
        ...(!_.isEmpty(severity) && { severity }),
        ...(!_.isEmpty(reason) && { reason })
      }
      
      if (_.isEmpty(filters.deviceId) && _.isEmpty(filters.locationId) && req.query.userId) {
        // User ID has no device or locations associated.
        return Promise.resolve({
          items: [],
          total: 0,
          page: 0,
          pageSize: 0
        });
      }

      const alarmEvents = await this.alertService.getAlarmEventsByFilter(filters as AlarmEventFilter, {
        $select: {
          id: true,
          timezone: true
        }
      });

      return {
        ...alarmEvents,
        items: alarmEvents.items.map((alarmEvent) => ({
          ...alarmEvent,
          ...alarmEvent.createAt && { createAt: convertToLocalTimeWithOffset(alarmEvent.createAt, alarmEvent.location?.timezone) },
          ...alarmEvent.updateAt && { updateAt: convertToLocalTimeWithOffset(alarmEvent.updateAt, alarmEvent.location?.timezone) },
          ...alarmEvent.resolutionDate && { resolutionDate: convertToLocalTimeWithOffset(alarmEvent.resolutionDate, alarmEvent.location?.timezone) }
        }))
      };
    }

    @httpGet('/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async getIncident(@requestParam('id') id: string): Promise<AlarmEvent> {
      return this.alertService.getAlarmEvent(id);
    }
  }

  return EventController;
}
