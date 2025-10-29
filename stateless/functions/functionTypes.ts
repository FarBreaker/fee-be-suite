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

export interface QuizAnswer {
	id: string;
	text: string;
	isCorrect: boolean;
}

export interface QuizQuestion {
	id: string;
	question: string;
	answers: QuizAnswer[];
}

export interface Quiz {
	id: string;
	title: string;
	questions: QuizQuestion[];
	createdAt: string;
	updatedAt: string;
	eventId: string;
	eventTitle: string;
}

export interface QuizMetadata {
	questionCount: number;
	totalAnswers: number;
	averageAnswersPerQuestion: number;
	hasEventAssociation: boolean;
	uploadTimestamp: string;
	fileSize: number;
}

export interface UploadQuizInput {
	quiz: Quiz;
	metadata: QuizMetadata;
}

export interface UploadQuizResponse {
	status: string;
	message: string;
	key: string;
	eventSlug: string;
}
