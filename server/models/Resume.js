import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
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

const educationSchema = new mongoose.Schema(
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

const projectSchema = new mongoose.Schema(
  {
    name: String,
    link: String,
    description: String,
    bullets: [String],
    tech: [String],
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: String,
    issuer: String,
    date: String,
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, default: "Untitled Resume" },
    templateId: {
      type: String,
      enum: ["classic", "modern", "minimal", "technical"],
      default: "classic",
    },

    // A tailored copy of a resume, forked for a specific job application
    baseResumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", default: null },
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

export default mongoose.model("Resume", resumeSchema);
