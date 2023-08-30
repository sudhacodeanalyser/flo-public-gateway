import { injectable, inject } from 'inversify';
import { UnsubscribePreferences, BatchUnsubscribePreferences } from '../core/api/model/Email';
import * as _ from 'lodash';
import { HttpError, HttpService } from '../http/HttpService'

export enum EmailTypes {
  WEEKLY_EMAIL = 1,
}

@injectable()
class EmailGatewayService extends HttpService {
  constructor(
    @inject('EmailGatewayUrl') public readonly url: string
  ) {
    super();
  }

  public async queue(emailAddress: string, templateId: string, data: Record<string, any>): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.url }/queue`,
      body: {
        client_app_name: 'Public Gateway',
        time_stamp: new Date().toISOString(),
        recipients: [{
          email_address: emailAddress,
          data: {
            template_id: templateId,
            email_template_data: {
              data
            }
          }
        }]
      }
    };

    await this.sendRequest(request);
  }

  public async getUnsubscribePreferences(email: string): Promise<UnsubscribePreferences> {
    const request = {
      method: 'GET',
      url: `${this.url}/unsubscribe/email/${email}`
    }

    return this.sendRequest(request);
  }

  public async deleteUnsubscribePreferences(email: string): Promise<void>{
    const request = {
      method: 'DELETE',
      url: `${this.url}/unsubscribe/email/${email}`
    };

    return this.sendRequest(request);
  }

  public async updateUnsubscribePreferences(email: string, preferences: number[]): Promise<UnsubscribePreferences> {
    const request = {
      method: 'POST',
      url: `${this.url}/unsubscribe/email/${email}`,
      body: {
        emailTypeIds: preferences
      }
    };

    return this.sendRequest(request);
  }

  public async addUnsubscribePreferences(email: string, preferences: number[]): Promise<UnsubscribePreferences> {
    let currentPreferences;
    let typeIds;

    try {
      currentPreferences = await this.getUnsubscribePreferences(email);
      typeIds = preferences.reduce((acc: number[], id) => acc.includes(id) ? acc : [...acc, id], currentPreferences.emailTypes);
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        typeIds = preferences;
      } else {
        throw err;
      }
    }

    const request = {
      method: 'POST',
      url: `${this.url}/unsubscribe/email/${email}`,
      body: {
        emailTypeIds: typeIds
      }
    };

    return this.sendRequest(request);
  }

  public async removeUnsubscribePreferences(email: string, preferences: number[]): Promise<void> {
    try {
      const currentPreferences = await this.getUnsubscribePreferences(email);
      const typeIds = _.without(currentPreferences.emailTypes, ...preferences);
      if (typeIds.length === 0) {
        await this.deleteUnsubscribePreferences(email);
      } else {
        await this.updateUnsubscribePreferences(email, typeIds);
      }
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        // user has no unsubscribe preferences
        return;
      } else {
        throw err;
      }
    }
  }
}

export { EmailGatewayService };
