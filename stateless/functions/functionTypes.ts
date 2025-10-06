export interface CreateEventDTO {
	title: string;
	description: string;
	slug: string;
	from: string;
	assetUrl: string;
	to: string;
	location: string;
	trainingUrl?: string;
	creationDate: string;
	eventType: string;
	creditNumber: number;
	eventSchedule: EventScheduleItem[];
	referees: EventReferee[];
	extraInfo?: EventExtraItem;
}
export interface EventScheduleItem {
	time: string;
	title: string;
}
export interface FileUploadResponse {
	status: string;
	url: string;
}
export interface EventExtraItem {
	roomReservation?: boolean;
	airTransfer?: boolean;
	dinnerConfirmation?: boolean;
}
export interface EventReferee {
	title: string;
	fullName: string;
	linkedinUrl?: string;
}

export interface DeleteEventInput {
	sk: string;
}

export interface EventRegistrationDTO {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	eventSlug: string;
	eventType: string;
	paymentScreenshot?: string; // This will be the file data (base64 or buffer)
}
