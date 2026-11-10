"""SPHEREx Mover Detection - Confidence Scoring.

Computes normalized confidence scores in [0.0, 1.0] from photometric S/N,
astrometric fit residuals (RMS), and observation epoch coverage.
"""

from __future__ import annotations


def compute_mover_confidence(
    snr_mean: float,
    rms_arcsec: float,
    epoch_count: int,
    max_rms_arcsec: float = 1.5,
    snr_min: float = 3.0,
    snr_sat: float = 18.0,
    min_epochs: int = 3,
    max_epochs_expected: int = 6,
) -> float:
    """Calculate mover detection confidence score between 0.0 and 1.0.

    Mathematical Formulation:
    -------------------------
    The confidence metric C is a weighted linear combination of three normalized
    observational indicators:

        C = w_snr * f(SNR) + w_rms * g(RMS) + w_ep * h(N_ep)

    Where:
    1. Signal-to-Noise Term f(SNR):
       f(SNR) = clip((SNR_mean - snr_min) / (snr_sat - snr_min), 0.0, 1.0)
       Evaluates detection statistical significance above the background.

    2. Astrometric Linearity Term g(RMS):
       g(RMS) = max(0.0, 1.0 - (RMS / max_rms_arcsec))
       Penalizes orbital curvature or false associations deviating from
       constant linear on-sky velocity.

    3. Multi-Epoch Confirmation Term h(N_ep):
       h(N_ep) = clip((N_ep - min_epochs + 1) / (max_epochs_expected - min_epochs + 1), 0.0, 1.0)
       Rewards tracks verified across numerous distinct temporal epochs.

    Weights:
        w_snr = 0.45 (Photometric significance)
        w_rms = 0.35 (Astrometric trajectory consistency)
        w_ep  = 0.20 (Temporal persistence)
        Sum of weights = 1.00

    Returns
    -------
    confidence : float
        Bounded confidence score in range [0.0, 1.0].
    """
    # 1. Photometric SNR factor
    f_snr = max(0.0, min(1.0, (snr_mean - snr_min) / max(1e-3, snr_sat - snr_min)))

    # 2. Astrometric residual factor
    g_rms = max(0.0, 1.0 - (rms_arcsec / max(1e-3, max_rms_arcsec)))

    # 3. Temporal epoch coverage factor
    denom = max(1, max_epochs_expected - min_epochs + 1)
    h_ep = max(0.0, min(1.0, (epoch_count - min_epochs + 1) / denom))

    # Weighted combination
    w_snr = 0.45
    w_rms = 0.35
    w_ep = 0.20

    raw_score = (w_snr * f_snr) + (w_rms * g_rms) + (w_ep * h_ep)
    confidence = max(0.0, min(1.0, raw_score))

    return round(float(confidence), 3)
