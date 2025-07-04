import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white text-center p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Sorry, the page you are looking for does not exist or you do not have permission to view it.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-ki-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Home
      </Link>
    </div>
  );
}; 