import { UserManager, User } from '../model/User';

export class AuthController {
  static getSession(): User {
    return UserManager.getActiveUser();
  }

  static resetStats(): User {
    return UserManager.resetStats();
  }
}
