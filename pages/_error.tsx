import type { NextPageContext } from 'next';

interface ErrorProps {
	statusCode?: number;
}

export default function CustomError({ statusCode }: ErrorProps) {
	return (
		<div>
			{statusCode ? `An error ${statusCode} occurred on server` : 'An error occurred on client'}
		</div>
	);
}

CustomError.getInitialProps = ({ res, err }: NextPageContext) => {
	const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
	return { statusCode };
};
