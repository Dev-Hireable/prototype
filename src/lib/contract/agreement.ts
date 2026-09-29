import type { JobType } from "./job-types";

/** The template's opening and disclaimer — the same on every agreement. */
const AGREEMENT_PREAMBLE = `USE OF THIS TEMPLATE IS OPTIONAL. HIREABLE OFFERS THE PARTIES THE OPTION TO UPLOAD THEIR OWN TERMS INSTEAD OF USING THIS TEMPLATE.

Important Disclaimer: This is a form provided on an "as is" basis without representation or warranty of any kind as to its contents. Hireable, its employees, independent contractors or lawyers are not providing you with legal advice and any use of the form is at your own risk. This form is intended to be an example of a services agreement for the Philippines, to be used as an information tool and should not be viewed as a substitute for legal advice.`;

const AGREEMENT = `HIREABLE SERVICES AGREEMENT

TRIAL CONTRACT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder during the trial period.

2. Compensation. The Team Builder funds the trial rate into escrow at acceptance. Escrow is released at the end of the trial on approval of the final evaluation.

3. Term. This agreement runs from the start date to the end date shown in the Offer Details unless ended earlier under section 6.

4. Tasks. The parties agree the trial tasks listed above. They are tracked on a shared task list, and the hiring manager reviews each one as it is completed.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the trial early with written notice through the platform. Escrow is released pro rata on approval.`;

/**
 * TB-072 / IN-046 — what a full-time offer is signed against. The offer page used to show the
 * trial agreement: escrow at acceptance, a trial period and pro-rata escrow release.
 */
const FULLTIME_AGREEMENT = `HIREABLE SERVICES AGREEMENT

FULL-TIME ENGAGEMENT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder on an ongoing basis from the start date.

2. Compensation. The Team Builder pays the monthly salary shown in the Offer Details at the end of each month, with the exclusive benefits marked as included. No escrow is held on a full-time engagement.

3. Term. This agreement starts on the start date shown in the Offer Details and continues until either party ends it under section 6.

4. Tasks. Work is tracked on a shared task list that either party can add to. The hiring manager reviews each task as it is completed, with evaluations along the way.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the engagement with 30 days' written notice through the platform. Salary is paid pro rata up to the last working day.`;

/** What a part-time offer is signed against: a monthly rate for the hours a week agreed, no benefits. */
const PARTTIME_AGREEMENT = `HIREABLE SERVICES AGREEMENT

PART-TIME ENGAGEMENT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder for the hours a week shown there, on an ongoing basis from the start date.

2. Compensation. The Team Builder pays the monthly rate shown in the Offer Details at the end of each month. No escrow is held on a part-time engagement, and the exclusive benefits of a full-time engagement do not apply.

3. Term. This agreement starts on the start date shown in the Offer Details and continues until either party ends it under section 6.

4. Tasks. Work is tracked on a shared task list that either party can add to. The hiring manager reviews each task as it is completed, with evaluations along the way.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the engagement with 14 days' written notice through the platform. The rate is paid pro rata up to the last working day.`;

/** The agreement an offer of this type is signed against. */
export const agreementFor = (type: JobType) => (type === "full-time" ? FULLTIME_AGREEMENT : type === "part-time" ? PARTTIME_AGREEMENT : AGREEMENT);
