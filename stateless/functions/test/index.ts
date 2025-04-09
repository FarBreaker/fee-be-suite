

export const testFunction = async (): Promise<any> => {
	return {
		statusCode: 200,
		body: JSON.stringify("Hello World"),
	};
};
