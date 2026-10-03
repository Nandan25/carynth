import mongoose, { Schema, Document, Types } from "mongoose";

export type TemplateId = "classic" | "modern" | "minimal" | "technical";

export interface IExperience {
  company?: string;
  role?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  bullets: string[];
}

export interface IEducation {
  school?: string;
  degree?: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  details?: string;
}

export interface IProject {
  name?: string;
  link?: string;
  description?: string;
  bullets: string[];
  tech: string[];
}

export interface ICertification {
  name?: string;
  issuer?: string;
  date?: string;
}

export interface IPersonalInfo {
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
}

export interface IAtsCheck {
  score?: number;
  missingKeywords?: string[];
  notes?: string;
  checkedAt?: Date;
}

export interface IResume extends Document {
  owner: Types.ObjectId;
  title: string;
  templateId: TemplateId;
  baseResumeId: Types.ObjectId | null;
  jobDescription: string;
  personalInfo: IPersonalInfo;
  experience: IExperience[];
  education: IEducation[];
  skills: string[];
  projects: IProject[];
  certifications: ICertification[];
  lastAtsCheck?: IAtsCheck;
  createdAt: Date;
  updatedAt: Date;
}

const experienceSchema = new Schema<IExperience>(
  {
    company: String,
    role: String,
    location: String,
    startDate: String,
    endDate: String,
    current: { type: Boolean, default: false },
    bullets: [String],
  },
  { _id: false }
);

const educationSchema = new Schema<IEducation>(
  {
    school: String,
    degree: String,
    field: String,
    location: String,
    startDate: String,
    endDate: String,
    details: String,
  },
  { _id: false }
);

const projectSchema = new Schema<IProject>(
  {
    name: String,
    link: String,
    description: String,
    bullets: [String],
    tech: [String],
  },
  { _id: false }
);

const certificationSchema = new Schema<ICertification>(
  {
    name: String,
    issuer: String,
    date: String,
  },
  { _id: false }
);

const resumeSchema = new Schema<IResume>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, default: "Untitled Resume" },
    templateId: {
      type: String,
      enum: ["classic", "modern", "minimal", "technical"],
      default: "classic",
    },

    // A tailored copy of a resume, forked for a specific job application
    baseResumeId: { type: Schema.Types.ObjectId, ref: "Resume", default: null },
    jobDescription: { type: String, default: "" },

    personalInfo: {
      fullName: String,
      title: String,
      email: String,
      phone: String,
      location: String,
      website: String,
      linkedin: String,
      github: String,
      summary: String,
    },

    experience: [experienceSchema],
    education: [educationSchema],
    skills: [String],
    projects: [projectSchema],
    certifications: [certificationSchema],

    // Cached result of the most recent ATS check, so the dashboard can show
    // a score without re-calling Gemini
    lastAtsCheck: {
      score: Number,
      missingKeywords: [String],
      notes: String,
      checkedAt: Date,
    },
  },
  { timestamps: true }
);

resumeSchema.index({ owner: 1, updatedAt: -1 });

export default mongoose.model<IResume>("Resume", resumeSchema);
