<template>
  <div class="about-page">
    <section class="about-section mb-4">
      <div class="page-heading text-center mb-4">
        <div class="section-eyebrow">
          PICKLEBALL TEAM FLOW
        </div>

        <h1 class="page-title mb-2">
          Privacy Policy
        </h1>

        <p class="page-subtitle text-secondary mb-0">
          How the app handles player names, photos, and your data.
        </p>
      </div>

      <ion-card class="about-card">
        <ion-card-content class="about-card-content">
          <p class="about-text">
            <strong>Last updated: August 31, 2026</strong>
          </p>

          <p class="about-text">
            Pickleball Team Flow respects your privacy. The app does not require
            users to create an account or provide personal information to
            Pickleball Team Flow.
          </p>

          <div class="about-block">
            <h2 class="about-heading">
              Player Names
            </h2>

            <p class="about-text">
              Player names entered into the app are used to create pickleball court
              assignments, player rotations, and matchups. Pickleball Team Flow does
              not upload player names to a Pickleball Team Flow server.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Photos and Camera Access
            </h2>

            <p class="about-text">
              The app may use the device camera or photo library to help recognize
              player names from an image. Images selected for name recognition are
              processed for that purpose and are not stored by Pickleball Team Flow.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Accounts
            </h2>

            <p class="about-text">
              Pickleball Team Flow does not currently require or provide user accounts.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Data Sharing
            </h2>

            <p class="about-text">
              Pickleball Team Flow does not sell personal information or player information.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Changes to This Policy
            </h2>

            <p class="about-text">
              This Privacy Policy may be updated as the app evolves. Any changes will
              be reflected on this page.
            </p>
          </div>

          <div class="about-block">
            <h2 class="about-heading">
              Contact
            </h2>

            <p class="about-text">
              Questions about this Privacy Policy may be submitted through the
              <router-link to="/support" class="about-link">
                support page
              </router-link>.
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
  name: 'Privacy',

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
