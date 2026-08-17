/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiResponse } from 'next';

type RecordedResponse = NextApiResponse & {
	statusCode?: number;
	body?: unknown;
	headers: Record<string, string | string[] | number | undefined>;
	redirectDestination?: string;
};

export const createMockResponse = (): RecordedResponse => {
	const response: any = {
		headers: {},
		statusCode: 200,
		setHeader(this: any, name: string, value: string | string[] | number | undefined) {
			this.headers[name] = value;
			return this;
		},
		getHeader(this: any, name: string) {
			return this.headers[name];
		},
		status(this: any, code: number) {
			this.statusCode = code;
			return this;
		},
		json(this: any, payload: unknown) {
			this.body = payload;
			return this;
		},
		end(this: any, payload?: unknown) {
			this.body = payload;
			return this;
		},
		redirect(this: any, statusOrUrl: number | string, url?: string) {
			if (typeof statusOrUrl === 'number') {
				this.statusCode = statusOrUrl;
				this.redirectDestination = url;
			} else {
				this.redirectDestination = statusOrUrl;
			}

			return this;
		},
	} as unknown as RecordedResponse;

	return response;
};
