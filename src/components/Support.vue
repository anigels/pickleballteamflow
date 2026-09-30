<template>
  <div class="about-page">
    <section class="about-section mb-4">
      <div class="page-heading text-center mb-4">
        <div class="section-eyebrow">
          PICKLEBALL TEAM FLOW
        </div>

        <h1 class="page-title mb-2">
          Support
        </h1>

        <p class="page-subtitle text-secondary mb-0">
          Answers to common questions and troubleshooting tips.
        </p>
      </div>

      <ion-card class="about-card">
        <ion-card-content class="about-card-content">
          <div class="about-block">
            <h2 class="about-heading">
              Getting Started
            </h2>

            <p class="about-text">
              Enter between 8 and 24 player names, select the number of courts
              and rounds, and choose <strong>Generate Court Assignments</strong>.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Scanning Player Names
            </h2>

            <p class="about-text">
              Pickleball Team Flow can use a photo to recognize player names.
              For best results, use a clear, well-lit image with easily readable text.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Camera Problems
            </h2>

            <p class="about-text">
              If camera access was previously denied, open your device Settings,
              find Pickleball Team Flow, and allow camera access.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Incorrect Name Recognition
            </h2>

            <p class="about-text">
              Name recognition may not always identify every name correctly.
              You can edit the player roster after names have been extracted from an image.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Privacy
            </h2>

            <p class="about-text">
              For information about how Pickleball Team Flow handles player names and
              photos, please review our
              <router-link to="/privacy" class="about-link">
                Privacy Policy
              </router-link>.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Contact Support
            </h2>

            <p class="about-text">
              If you need additional help, have feedback, or would like to report
              a problem, please contact us at
              <a
                href="mailto:support@pickleballteamflow.app?subject=Pickleball%20Team%20Flow%20Support"
                class="about-link"
              >
                support@pickleballteamflow.app
              </a>.
            </p>
          </div>
        </ion-card-content>
      </ion-card>
    </section>
  </div>
</template>

<script>
import {
  IonCard,
  IonCardContent
} from '@ionic/vue';

export default {
  name: 'Support',

  components: {
    IonCard,
    IonCardContent
  }
};
</script>

<style scoped>
.about-page {
  width: 100%;
  min-width: 0;
}

.about-page *,
.about-page *::before,
.about-page *::after {
  box-sizing: border-box;
}

.section-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  color: #198754;
}

.page-heading {
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}

.page-title {
  font-size: clamp(1.7rem, 5vw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.page-subtitle {
  font-size: 1rem;
  line-height: 1.5;
}

.about-card {
  width: 100%;
  margin: 0;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.08);
}

.about-card-content {
  padding: 1.5rem;
}

.about-block {
  margin-bottom: 1.75rem;
}

.about-block:last-of-type {
  margin-bottom: 0;
}

.about-heading {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2d23;
}

.about-text {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #6c757d;
}

.about-text:last-child {
  margin-bottom: 0;
}

.about-link {
  font-size: 0.95rem;
  font-weight: 600;
  color: #198754;
  text-decoration: none;
}

.about-link:hover,
.about-link:focus {
  color: #0e4b2e;
  text-decoration: underline;
}
</style>
