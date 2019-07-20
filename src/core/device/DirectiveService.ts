import Request from '../api/Request';

export interface DirectiveService {
  openValve(id: string): Promise<void>;
  closeValve(id: string): Promise<void>;
  reboot(id: string): Promise<void>;
}

export interface DirectiveServiceFactory {
  create(req: Request): DirectiveService;
}