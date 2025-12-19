import { BRollAsset, SceneCutaway } from '../types';

// Medical Bills Negotiation Project Configuration
// Video source: /scenes/medical_bills.mp4

export const MEDICAL_BILLS_VIDEO_SOURCE = '/scenes/medical_bills.mp4';

// B-Roll assets for Medical Bills project
export const medicalBillsAssets: BRollAsset[] = [
  {
    id: 'mb_medical_bill_shock',
    filename: 'medical_bill_shock.mp4',
    path: '/broll/medical-bills/medical_bill_shock.mp4',
    description: 'Person shocked by medical bill',
    status: 'pending',
    usedInScenes: ['Scene 01'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_worried_person_bills',
    filename: 'worried_person_bills.mp4',
    path: '/broll/medical-bills/worried_person_bills.mp4',
    description: 'Person worried looking at bills',
    status: 'pending',
    usedInScenes: ['Scene 02', 'Scene 12'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_hospital_exterior',
    filename: 'hospital_exterior.mp4',
    path: '/broll/medical-bills/hospital_exterior.mp4',
    description: 'Hospital building exterior',
    status: 'pending',
    usedInScenes: ['Scene 02'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_calculator_finances',
    filename: 'calculator_finances.mp4',
    path: '/broll/medical-bills/calculator_finances.mp4',
    description: 'Calculator and financial documents',
    status: 'pending',
    usedInScenes: ['Scene 03', 'Scene 06'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_document_review',
    filename: 'document_review.mp4',
    path: '/broll/medical-bills/document_review.mp4',
    description: 'Person reviewing documents',
    status: 'pending',
    usedInScenes: ['Scene 03', 'Scene 04', 'Scene 07'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_person_reading_paper',
    filename: 'person_reading_paper.mp4',
    path: '/broll/medical-bills/person_reading_paper.mp4',
    description: 'Person reading paperwork',
    status: 'pending',
    usedInScenes: ['Scene 04'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_magnifying_glass_document',
    filename: 'magnifying_glass_document.mp4',
    path: '/broll/medical-bills/magnifying_glass_document.mp4',
    description: 'Magnifying glass over document',
    status: 'pending',
    usedInScenes: ['Scene 05'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_person_computer_research',
    filename: 'person_computer_research.mp4',
    path: '/broll/medical-bills/person_computer_research.mp4',
    description: 'Person researching on computer',
    status: 'pending',
    usedInScenes: ['Scene 05', 'Scene 06', 'Scene 07'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_cash_payment',
    filename: 'cash_payment.mp4',
    path: '/broll/medical-bills/cash_payment.mp4',
    description: 'Cash payment transaction',
    status: 'pending',
    usedInScenes: ['Scene 08'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_happy_relieved_person',
    filename: 'happy_relieved_person.mp4',
    path: '/broll/medical-bills/happy_relieved_person.mp4',
    description: 'Happy and relieved person',
    status: 'pending',
    usedInScenes: ['Scene 08'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_calendar_planning',
    filename: 'calendar_planning.mp4',
    path: '/broll/medical-bills/calendar_planning.mp4',
    description: 'Calendar and planning',
    status: 'pending',
    usedInScenes: ['Scene 09'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_signing_document',
    filename: 'signing_document.mp4',
    path: '/broll/medical-bills/signing_document.mp4',
    description: 'Person signing document',
    status: 'pending',
    usedInScenes: ['Scene 09'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_family_happy',
    filename: 'family_happy.mp4',
    path: '/broll/medical-bills/family_happy.mp4',
    description: 'Happy family together',
    status: 'pending',
    usedInScenes: ['Scene 10'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_filling_form',
    filename: 'filling_form.mp4',
    path: '/broll/medical-bills/filling_form.mp4',
    description: 'Person filling out a form',
    status: 'pending',
    usedInScenes: ['Scene 10'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_person_writing',
    filename: 'person_writing.mp4',
    path: '/broll/medical-bills/person_writing.mp4',
    description: 'Person writing',
    status: 'pending',
    usedInScenes: ['Scene 11'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_handshake_agreement',
    filename: 'handshake_agreement.mp4',
    path: '/broll/medical-bills/handshake_agreement.mp4',
    description: 'Handshake agreement',
    status: 'pending',
    usedInScenes: ['Scene 11'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_happy_celebrating',
    filename: 'happy_celebrating.mp4',
    path: '/broll/medical-bills/happy_celebrating.mp4',
    description: 'Person celebrating success',
    status: 'pending',
    usedInScenes: ['Scene 12'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_checklist_notepad',
    filename: 'checklist_notepad.mp4',
    path: '/broll/medical-bills/checklist_notepad.mp4',
    description: 'Checklist on notepad',
    status: 'pending',
    usedInScenes: ['Scene 13'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_confident_person',
    filename: 'confident_person.mp4',
    path: '/broll/medical-bills/confident_person.mp4',
    description: 'Confident person',
    status: 'pending',
    usedInScenes: ['Scene 13'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'mb_person_smiling_thumbsup',
    filename: 'person_smiling_thumbsup.mp4',
    path: '/broll/medical-bills/person_smiling_thumbsup.mp4',
    description: 'Person smiling with thumbs up',
    status: 'pending',
    usedInScenes: ['Scene 14'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  }
];

// Scene durations from audio files (seconds) - Updated to match actual audio
// Scene 01: 15s, Scene 02: 18s, Scene 03: 19.5s, Scene 04: 16.5s
// Scene 05: 15.5s, Scene 06: 18.5s, Scene 07: 16.5s, Scene 08: 16s
// Scene 09: 15.5s, Scene 10: 17s, Scene 11: 17.5s, Scene 12: 22s
// Scene 13: 19s, Scene 14: 15s

export const medicalBillsSceneCutaways: SceneCutaway[] = [
  {
    sceneId: 'scene_mb_01',
    sceneTitle: 'Scene 01 - Title Card',
    duration: 15.0,
    cutaways: [
      { video: '/broll/medical-bills/medical_bill_shock.mp4', startTime: 2.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 }
    ],
    statistics: {
      main: '80%',
      mainSubtitle: 'of medical bills contain errors'
    }
  },
  {
    sceneId: 'scene_mb_02',
    sceneTitle: 'Scene 02 - The Problem',
    duration: 18.0,
    cutaways: [
      { video: '/broll/medical-bills/worried_person_bills.mp4', startTime: 1.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/hospital_exterior.mp4', startTime: 10.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '$5,000/year',
      mainSubtitle: 'Average unexpected medical bills',
      secondary: '$15,000+',
      secondarySubtitle: 'Overnight hospital stay'
    }
  },
  {
    sceneId: 'scene_mb_03',
    sceneTitle: 'Scene 03 - Why Bills Are Negotiable',
    duration: 19.5,
    cutaways: [
      { video: '/broll/medical-bills/calculator_finances.mp4', startTime: 2.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/document_review.mp4', startTime: 10.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '4-10x',
      mainSubtitle: 'Chargemaster markup',
      secondary: '50-70%',
      secondarySubtitle: 'Insurance company discounts'
    }
  },
  {
    sceneId: 'scene_mb_04',
    sceneTitle: 'Scene 04 - Step 1: Request Itemized Bill',
    duration: 16.5,
    cutaways: [
      { video: '/broll/medical-bills/document_review.mp4', startTime: 3.0, duration: 5.0, style: 'fullscreen', videoStartTime: 2, playbackRate: 0.9 },
      { video: '/broll/medical-bills/person_reading_paper.mp4', startTime: 11.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '80%',
      mainSubtitle: 'of medical bills contain errors'
    }
  },
  {
    sceneId: 'scene_mb_05',
    sceneTitle: 'Scene 05 - Step 2: Check for Errors',
    duration: 15.5,
    cutaways: [
      { video: '/broll/medical-bills/magnifying_glass_document.mp4', startTime: 2.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/person_computer_research.mp4', startTime: 10.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '40%',
      mainSubtitle: 'Duplicate charges',
      secondary: '30%',
      secondarySubtitle: 'Services not received'
    }
  },
  {
    sceneId: 'scene_mb_06',
    sceneTitle: 'Scene 06 - Step 3: Research Fair Prices',
    duration: 18.5,
    cutaways: [
      { video: '/broll/medical-bills/person_computer_research.mp4', startTime: 2.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/calculator_finances.mp4', startTime: 10.0, duration: 5.0, style: 'fullscreen', videoStartTime: 2, playbackRate: 1.0 }
    ],
    statistics: {
      main: '$1,000',
      mainSubtitle: 'Average MRI cost',
      secondary: '$3,000',
      secondarySubtitle: 'Your bill = 3x LEVERAGE'
    }
  },
  {
    sceneId: 'scene_mb_07',
    sceneTitle: 'Scene 07 - Step 4: Call Billing Department',
    duration: 16.5,
    cutaways: [
      { video: '/broll/medical-bills/person_computer_research.mp4', startTime: 2.0, duration: 6.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/document_review.mp4', startTime: 11.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '50-100%',
      mainSubtitle: 'Charity care discount'
    }
  },
  {
    sceneId: 'scene_mb_08',
    sceneTitle: 'Scene 08 - Step 5: Ask for Cash Discount',
    duration: 16.0,
    cutaways: [
      { video: '/broll/medical-bills/cash_payment.mp4', startTime: 2.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/happy_relieved_person.mp4', startTime: 10.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '25-40%',
      mainSubtitle: 'Cash discount range',
      secondary: '$3,000',
      secondarySubtitle: 'SAVED on $10,000 bill'
    }
  },
  {
    sceneId: 'scene_mb_09',
    sceneTitle: 'Scene 09 - Step 6: Set Up Payment Plan',
    duration: 15.5,
    cutaways: [
      { video: '/broll/medical-bills/calendar_planning.mp4', startTime: 2.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/signing_document.mp4', startTime: 10.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '0%',
      mainSubtitle: 'INTEREST - Required by law',
      secondary: '$50-$100/mo',
      secondarySubtitle: 'Affordable monthly payments'
    }
  },
  {
    sceneId: 'scene_mb_10',
    sceneTitle: 'Scene 10 - Step 7: Financial Assistance',
    duration: 17.0,
    cutaways: [
      { video: '/broll/medical-bills/family_happy.mp4', startTime: 4.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/filling_form.mp4', startTime: 12.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '<$120,000',
      mainSubtitle: 'Family of 4 income qualifies',
      secondary: '50-100%',
      secondarySubtitle: 'OFF through ACA programs'
    }
  },
  {
    sceneId: 'scene_mb_11',
    sceneTitle: 'Scene 11 - Step 8: Dispute Unfair Charges',
    duration: 17.5,
    cutaways: [
      { video: '/broll/medical-bills/person_writing.mp4', startTime: 2.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/handshake_agreement.mp4', startTime: 10.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ]
  },
  {
    sceneId: 'scene_mb_12',
    sceneTitle: 'Scene 12 - Sarah\'s Success Story',
    duration: 22.0,
    cutaways: [
      { video: '/broll/medical-bills/worried_person_bills.mp4', startTime: 1.0, duration: 4.0, style: 'fullscreen', videoStartTime: 2, playbackRate: 0.9 },
      { video: '/broll/medical-bills/happy_celebrating.mp4', startTime: 13.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ],
    statistics: {
      main: '$28,000',
      mainSubtitle: 'Original bill',
      secondary: '$6,500',
      secondarySubtitle: 'Final bill (77% saved!)'
    }
  },
  {
    sceneId: 'scene_mb_13',
    sceneTitle: 'Scene 13 - Key Takeaways',
    duration: 19.0,
    cutaways: [
      { video: '/broll/medical-bills/checklist_notepad.mp4', startTime: 1.0, duration: 6.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
      { video: '/broll/medical-bills/confident_person.mp4', startTime: 12.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1.0 }
    ]
  },
  {
    sceneId: 'scene_mb_14',
    sceneTitle: 'Scene 14 - Call to Action',
    duration: 15.0,
    cutaways: [
      { video: '/broll/medical-bills/person_smiling_thumbsup.mp4', startTime: 5.0, duration: 5.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 }
    ]
  }
];

// Project template for creating new Medical Bills projects
export const MEDICAL_BILLS_PROJECT_TEMPLATE = {
  name: 'Medical Bills Negotiation',
  description: 'How to negotiate medical bills - 8 steps to reduce your healthcare costs',
  videoSource: MEDICAL_BILLS_VIDEO_SOURCE
};
