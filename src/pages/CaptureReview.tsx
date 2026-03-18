/**
 * Nova AI Clinical Capture - Review Page
 * /capture/review/:recordingId
 * Wraps RecordingReviewWorkspace with proper routing.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { RecordingReviewWorkspace } from '@/components/voice-capture/RecordingReviewWorkspace';

export default function CaptureReview() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();

  if (!recordingId) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No recording selected. <button onClick={() => navigate('/capture')} className="text-primary underline">Go to Capture Center</button>
      </div>
    );
  }

  return (
    <RecordingReviewWorkspace
      recordingId={recordingId}
      onBack={() => navigate('/capture')}
    />
  );
}
