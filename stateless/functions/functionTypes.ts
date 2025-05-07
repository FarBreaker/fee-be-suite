export interface CreateEventInput {
	title: string;
	creationDate: string;
	slug: string;
	scheduleUrl: string;
	creditsInfo: string;
}
export interface CreateFADInput extends CreateEventInput {
	from: string;
	to: string;
	trainingUrl: string;
}
export interface CreateReventInput extends CreateEventInput {
	date: string;
	where: string;
}
export interface DeleteEventInput {
	sk: string;
}
