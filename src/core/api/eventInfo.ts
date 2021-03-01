import { ResourceEventInfo } from "./model/ResourceEvent";
import Request, { extractIpAddress } from "./Request";

export function getEventInfo(req: Request) : ResourceEventInfo {
    const tokenMetadata = req.token;
    const userId = tokenMetadata && tokenMetadata.user_id;
    const ipAddress = extractIpAddress(req);
    const clientId = tokenMetadata && tokenMetadata.client_id;
    const userAgent = req.get('user-agent') || '';

    const eventInfo: ResourceEventInfo = {
      userId,
      ipAddress,
      clientId,
      userAgent        
    } 

    return eventInfo;
  }