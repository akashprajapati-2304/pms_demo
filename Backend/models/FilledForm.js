import mongoose from 'mongoose';

// Common Patient Schema
const patientSchema = new mongoose.Schema({
  patientName: String,
  patientMobile: String,
  alternateMobile: String,
  patientAge: Number,
  location: String,
  gender: String,
  status: String,
  category: String
});

// Common Attendant Schema
const attendantSchema = new mongoose.Schema({
  attendantName: String,
  attendantMobile: String
});

// Inbound Purpose Schemas
const appointmentSchema = new mongoose.Schema({
  department: String,
  dateTime: Date,
  doctor: String,
  remarks: String
});

const generalQuerySchema = new mongoose.Schema({
  department: String,
  remarks: String
});

const surgerySchema = new mongoose.Schema({
  surgeryName: String,
  department: String,
  doctor: String,
  remarks: String
});

const healthCheckupSchema = new mongoose.Schema({
  doctor: String,
  healthPackageName: String,
  remarks: String
});

const emergencyQuerySchema = new mongoose.Schema({
  department: String,
  doctor: String,
  issue: String,
  remarks: String
});

const callDropSchema = new mongoose.Schema({
  callBack: String,
  connected: String,
  disconnectionReason: String,
  remarks: String
});

const marketingCampaignSchema = new mongoose.Schema({
  marketingCampaignName: String,
  remarks: String
});

const complaintsSchema = new mongoose.Schema({
  department: String,
  doctor: String,
  remarks: String
});

const opdTimingsSchema = new mongoose.Schema({
  department: String,
  doctor: String,
  remarks: String
});

const diagnosingTestPriceSchema = new mongoose.Schema({
  department: String,
  doctor: String,
  remarks: String
});

const reportsSchema = new mongoose.Schema({
  reportName: String,
  remarks: String
});

const govtHealthSchemeSchema = new mongoose.Schema({
  department: String,
  healthSchemeName: String,
  remarks: String
});

const nonGovtHealthSchemeSchema = new mongoose.Schema({
  department: String,
  healthSchemeName: String,
  remarks: String
});

const ambulanceSchema = new mongoose.Schema({
  ambulanceLocation: String,
  ambulanceShared: String,
  remarks: String
});

const junkSchema = new mongoose.Schema({
  remarks: String
});

const jobRelatedSchema = new mongoose.Schema({
  remarks: String
});

// Outbound Purpose Schemas
const outboundAppointmentSchema = new mongoose.Schema({
  department: String,
  doctor: String,
  dateTime: Date,
  remarks: String
});

const followUpSchema = new mongoose.Schema({
  followupType: String,
  status: String,
  department: String,
  doctor: String,
  remarks: String
});

const informativeSchema = new mongoose.Schema({
  informativeTopic: String,
  detailsShared: String,
  remarks: String
});

const marketingSchema = new mongoose.Schema({
  marketingCampaignName: String,
  detailsShared: String,
  remarks: String
});

const feedbackQuestionSchema = new mongoose.Schema({
  question: String,
  rating: Number
});

const ipdFeedbackSchema = new mongoose.Schema({
  ipdNumber: String,
  questions: [feedbackQuestionSchema],
  remarks: String
});

const opdFeedbackSchema = new mongoose.Schema({
  opdNumber: String,
  questions: [feedbackQuestionSchema],
  remarks: String
});

const noFeedbackSchema = new mongoose.Schema({
  remarks: String
});

const notConnectedSchema = new mongoose.Schema({
  remarks: String
});

const missedCallSchema = new mongoose.Schema({
  connectionStatus: String,
  patientDetails: patientSchema,
  remarks: String
});

const leadPlatformSchema = new mongoose.Schema({
  lead: String,
  patientDetails: patientSchema,
  remarks: String
});

// Main FilledForm Schema
const filledFormSchema = new mongoose.Schema({
  formType: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  
  // Common Fields - Optional
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: false
  },
  agentId: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  // Inbound Form Data
  inboundData: {
    callerType: String,
    referenceFrom: String,
    patientDetails: patientSchema,
    attendantDetails: attendantSchema,
    purpose: String,
    
    // Purpose-specific data
    appointment: appointmentSchema,
    generalQuery: generalQuerySchema,
    surgery: surgerySchema,
    healthCheckup: healthCheckupSchema,
    emergencyQuery: emergencyQuerySchema,
    callDrop: callDropSchema,
    marketingCampaign: marketingCampaignSchema,
    complaints: complaintsSchema,
    opdTimings: opdTimingsSchema,
    diagnosingTestPrice: diagnosingTestPriceSchema,
    reports: reportsSchema,
    govtHealthScheme: govtHealthSchemeSchema,
    nonGovtHealthScheme: nonGovtHealthSchemeSchema,
    ambulance: ambulanceSchema,
    junk: junkSchema,
    jobRelated: jobRelatedSchema
  },
  
  // Outbound Form Data
  outboundData: {
    patientName: String,
    mobileNumber: String,
    purpose: String,
    
    // Purpose-specific data
    appointment: outboundAppointmentSchema,
    followup: followUpSchema,
    informative: informativeSchema,
    marketing: marketingSchema,
    feedback: {
      feedbackType: String,
      ipdFeedback: ipdFeedbackSchema,
      opdFeedback: opdFeedbackSchema,
      noFeedback: noFeedbackSchema,
      notConnected: notConnectedSchema
    },
    missedCall: missedCallSchema,
    justdial: leadPlatformSchema,
    practo: leadPlatformSchema,
    whatsapp: leadPlatformSchema,
    facebook: leadPlatformSchema
  }
}, {
  timestamps: true,
  collection: 'filledForms'  // Explicitly set the collection name
});

// Index for better query performance
filledFormSchema.index({ hospitalId: 1, submittedAt: -1 });
filledFormSchema.index({ agentId: 1, submittedAt: -1 });

// Explicitly specify the database
const db = mongoose.connection.useDb('crms');

export default db.model('FilledForm', filledFormSchema);