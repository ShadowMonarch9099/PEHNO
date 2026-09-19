// Every page except /login requires a session.
import { withAuth } from 'next-auth/middleware';

export default withAuth({ pages: { signIn: '/login' } });

export const config = { matcher: ['/((?!login|api/auth|_next|favicon.ico).*)'] };
