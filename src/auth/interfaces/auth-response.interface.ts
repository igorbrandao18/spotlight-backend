/**
 * Professional Authentication Response Interface
 * 
 * Following modern API standards (Auth0, Firebase, AWS Cognito)
 * Includes tokens, user information, account status and session metadata
 */
export interface AuthenticationResponse {
  // Authentication tokens with metadata
  tokens: TokenInfo;
  
  // Authenticated user information
  user: UserInfo;
  
  // Account information and status
  account: AccountInfo;
  
  // Session metadata
  session: SessionInfo;
}

export interface TokenInfo {
  accessToken: string;        // JWT token for authentication
  refreshToken: string;       // Token for renewal
  tokenType: string;          // Token type (Bearer)
  expiresIn: number;          // Expiration time in seconds
  expiresAt: Date;            // Expiration timestamp
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  areaActivity: string | null;
  avatar: string | null;
  coverImage: string | null;
  role: string;
}

export interface AccountInfo {
  status: string;
  enabled: boolean;
  firstLogin: boolean;
  plan: PlanInfo | null;
  isPro: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface PlanInfo {
  id: string;
  name: string;
  description: string | null;
}

export interface SessionInfo {
  authenticatedAt: Date;
  ipAddress: string | null;
  requiresPasswordChange: boolean;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
}

