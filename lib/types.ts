import type { Database, Enums, Tables } from "@/lib/database.types";

export type { Database };

export type Profile = Tables<"profiles">;
export type PracticeQuestion = Tables<"practice_questions">;
export type Achievement = Tables<"achievements">;
export type Skill = Tables<"skills">;
export type Career = Tables<"careers">;
export type CareerSkill = Tables<"career_skills">;
export type Company = Tables<"companies">;
export type Community = Tables<"communities">;
export type Education = Tables<"educations">;
export type Experience = Tables<"experiences">;
export type Project = Tables<"projects">;
export type UserSkill = Tables<"user_skills">;
export type Certification = Tables<"certifications">;
export type PortfolioItem = Tables<"portfolio_items">;
export type Resume = Tables<"resumes">;
export type CareerPreferences = Tables<"career_preferences">;
export type CareerGoal = Tables<"career_goals">;
export type JourneyEntry = Tables<"journey_entries">;
export type Roadmap = Tables<"roadmaps">;
export type RoadmapStage = Tables<"roadmap_stages">;
export type RoadmapTask = Tables<"roadmap_tasks">;
export type Post = Tables<"posts">;
export type Comment = Tables<"comments">;
export type Job = Tables<"jobs">;
export type Application = Tables<"applications">;
export type ApplicationEvent = Tables<"application_events">;
export type Invitation = Tables<"invitations">;
export type Notification = Tables<"notifications">;
export type Message = Tables<"messages">;
export type Conversation = Tables<"conversations">;

export type UserRole = Enums<"user_role">;
export type JobType = Enums<"job_type">;
export type ApplicationStatus = Enums<"application_status">;
export type PostType = Enums<"post_type">;
export type ExperienceKind = Enums<"experience_kind">;
export type CommunityKind = Enums<"community_kind">;
export type FollowTarget = Enums<"follow_target">;

/** Skill proficiency: 1 = basic, 2 = proficient, 3 = advanced. */
export type SkillLevel = 1 | 2 | 3;

/** Everything we know about one user's career profile, loaded together. */
export interface CareerProfileData {
  profile: Profile;
  skills: UserSkill[];
  educations: Education[];
  experiences: Experience[];
  projects: Project[];
  certifications: Certification[];
  portfolio: PortfolioItem[];
  preferences: CareerPreferences | null;
  goal: CareerGoal | null;
}

/** Skills, careers and their requirements — the reference catalogue. */
export interface Catalog {
  skills: Skill[];
  careers: Career[];
  careerSkills: CareerSkill[];
  skillById: Map<string, Skill>;
  careerById: Map<string, Career>;
  /** career id -> requirements sorted by importance (core first) */
  requirementsByCareer: Map<string, CareerSkill[]>;
}

/** Message attachment shared in chat (resume, portfolio, project, profile). */
export interface MessageAttachment {
  type: "resume" | "portfolio" | "project" | "profile";
  id: string;
  label: string;
  url?: string;
}
