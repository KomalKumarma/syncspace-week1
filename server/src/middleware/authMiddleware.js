import { verifyToken } from '../security/tokenService.js';
import { HttpError } from '../shared/httpError.js';

export function requireAuth(request, _response, next) {
  const header = request.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    next(new HttpError(401, 'Authorization token is required.'));
    return;
  }

  try {
    request.user = verifyToken(token, 'access');
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...roles) {
  return (request, _response, next) => {
    if (!roles.includes(request.user?.role)) {
      next(new HttpError(403, 'You do not have permission for this action.'));
      return;
    }

    next();
  };
}

