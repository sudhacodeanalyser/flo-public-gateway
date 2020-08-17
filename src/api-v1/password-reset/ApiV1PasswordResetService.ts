import { injectable, inject } from 'inversify';
import { PasswordResetService } from '../../core/user/PasswordResetService';
import { HttpService } from '../../http/HttpService';
import { LocalizationService } from '../../core/localization/LocalizationService';
import HttpError from '../../http/HttpError';

@injectable()
class ApiV1PasswordResetService extends HttpService implements PasswordResetService {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('LocalizationService') private localizationService: LocalizationService,
  ) {
    super();
  }

  public async requestReset(email: string, locale?: string, app?: string): Promise<void> {
    let templateId;
    if (app) {
      try {
        const { localizedValue: templateValue } = await this.localizationService.getLocalizedValue({
          name: `${app.toLowerCase().trim()}.password-reset.template`,
          type: 'email',
          locale: locale || 'en-us',
        });
        templateId = templateValue;
      } catch(err) {
        // Avoid displaying localization service error details to the user
        if (err instanceof HttpError && err.statusCode === 404) {
          throw new HttpError(404, `App name '${app}' not found`);
        } else {
          throw err;
        }
      }
    }
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/users/requestreset/user`,
      body: {
        email,
        app, // undefined defaults to user portal
        templateId, // undefined defaults to user portal template
      }
    };

    await this.sendRequest(request);
  }

  public async resetPassword(authToken: string, userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/users/${ userId }/resetpassword`,
      authToken,
      body: {
        old_pass: oldPassword,
        new_pass: newPassword,
        new_pass_conf: newPassword
      }
    };

    await this.sendRequest(request);
  }
}

export { ApiV1PasswordResetService };

