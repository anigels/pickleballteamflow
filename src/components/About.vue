<template>
  <div class="about-page">
    <header class="page-heading text-center mb-4">
      <div class="section-eyebrow">PICKLEBALL TEAM FLOW</div>
      <h1 class="page-title mb-2">Help &amp; About</h1>
      <p class="page-subtitle">Find answers when you need them.</p>
    </header>
    <ion-card class="about-card">
      <ion-card-content class="about-card-content">
        <ion-input v-model="query" type="search" label="Search help topics" label-placement="stacked" fill="outline"
          :clear-input="true" placeholder="e.g. roster, swap, scan" class="help-search" />
        <p v-if="query.trim()" role="status" aria-live="polite" class="about-text">
          {{ filteredTopics.length ? `${filteredTopics.length} ${filteredTopics.length === 1 ? 'topic' : 'topics'} found` : 'No matching topics. Try “roster”, “swap”, or “scan”.' }}
        </p>
        <ion-accordion-group v-model="expandedTopics" :multiple="true" :animated="false" aria-label="Help topics">
          <ion-accordion v-for="topic in filteredTopics" :key="topic.id" :value="topic.id">
            <ion-item slot="header" lines="none" class="help-topic-header">
              <ion-label><h2>{{ topic.title }}</h2></ion-label>
            </ion-item>
            <div slot="content" class="help-topic-content">
              <ol v-if="topic.steps.length" class="about-list">
                <li v-for="step in topic.steps" :key="step">{{ step }}</li>
              </ol>
              <p v-for="note in topic.notes" :key="note" class="about-text">{{ note }}</p>
              <template v-if="topic.id === 'about'">
                          <div class="about-block">
            <h2 class="about-heading">
              Development Team
            </h2>

            <div class="about-team-row">
              <div class="about-team-role">
                Developer:
              </div>

              <div class="about-team-name">
                Marco Rodriguez

                <a
                  href="https://www.linkedin.com/in/marco-rodriguez59"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="about-linkedin"
                  aria-label="Marco Rodriguez on LinkedIn"
                >
                  <ion-icon :icon="logoLinkedin" />
                </a>
              </div>
            </div>

            <div class="about-team-row">
              <div class="about-team-role">
                Project Manager/Developer:
              </div>

              <div class="about-team-name">
                Andrea Nigels

                <a
                  href="https://www.linkedin.com/in/andrea-nigels"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="about-linkedin"
                  aria-label="Andrea Nigels on LinkedIn"
                >
                  <ion-icon :icon="logoLinkedin" />
                </a>
              </div>
            </div>
          </div>


              </template>
            </div>
          </ion-accordion>
        </ion-accordion-group>
        <nav class="help-links" aria-label="Support and privacy">
          <router-link to="/support" class="about-link">Visit Support</router-link>
          <router-link to="/privacy" class="about-link">Privacy Policy</router-link>
        </nav>
        <footer class="about-footer">
          <small>Version {{ appVersion }}</small>
          <small>© 2026 Pickleball Team Flow. All rights reserved.</small>
        </footer>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script>
import { IonCard, IonCardContent, IonIcon, IonAccordion, IonAccordionGroup, IonItem, IonLabel, IonInput } from '@ionic/vue';
import { logoLinkedin } from 'ionicons/icons';
import { filterHelpTopics } from '../services/helpTopics.mjs';
export default {
  name: 'About',
  components: { IonCard, IonCardContent, IonIcon, IonAccordion, IonAccordionGroup, IonItem, IonLabel, IonInput },
  setup() { return { logoLinkedin }; },
  data() { return { appVersion: __APP_VERSION__, query: '', expandedTopics: [] }; },
  computed: { filteredTopics() { return filterHelpTopics(this.query); } }
};
</script>
<style scoped>
.about-page {
  width: 100%;
  min-width: 0;
  max-width: 48rem;
  margin-inline: auto;
  --ion-color-primary: #0d5132;
  --ion-color-primary-rgb: 13, 81, 50;
  --ion-color-primary-contrast: #fff;
}

.help-search { padding: 0; margin-bottom: 1rem; --background: #f5f7f6; --color: #26312c; --icon-color: #0d5132; --clear-button-color: #0d5132; --border-radius: .65rem; --box-shadow: none; }
.help-search:focus-within { outline: 3px solid #0d5132; outline-offset: 2px; border-radius: .65rem; }
.help-topic-header { --background: #e9f7ef; --color: #0d5132; --min-height: 3.5rem; --padding-start: 1rem; --inner-padding-end: 1rem; --background-hover: #0d5132; --background-focused: #0d5132; --background-activated: #0d5132; }
.help-topic-header h2 { font-size: 1.05rem; font-weight: 600; line-height: 1.5; margin: 0; }
.help-topic-header ion-label { white-space: normal; overflow-wrap: break-word; margin-block: .8rem; }
.help-topic-header::part(native):focus-visible { outline: 3px solid #0d5132; outline-offset: -3px; }
ion-accordion { margin-bottom: .65rem; border-radius: .65rem; border: 1px solid #dce5df; }
.help-topic-content { padding: 1rem; overflow-wrap: break-word; }
.help-topic-content .about-list { margin-bottom: .75rem; }
.help-links { display: flex; flex-wrap: wrap; gap: .5rem 1rem; margin-top: 1rem; }
.help-links .about-link { display: inline-flex; align-items: center; min-height: 2.75rem; padding: .5rem .75rem; border: 1px solid #0d5132; border-radius: .5rem; color: #0d5132; text-decoration: underline; }
.about-link:focus-visible, .about-linkedin:focus-visible { outline: 3px solid #0d5132; outline-offset: 2px; }

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
  font-size: clamp(
    1.7rem,
    5vw,
    2.5rem
  );

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

  box-shadow:
    0 3px 14px
    rgba(0, 0, 0, 0.08);
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

.about-list {
  margin: 0;
  padding-left: 1.25rem;
}

.about-list li {
  margin-bottom: 0.6rem;

  font-size: 0.95rem;
  line-height: 1.55;
  color: #495057;
}

.about-list li:last-child {
  margin-bottom: 0;
}

.about-list strong {
  color: #1f2d23;
}

.about-tip {
  display: flex;
  align-items: flex-start;

  gap: 0.6rem;

  margin-bottom: 1.75rem;
  padding: 1rem;

  border-radius: 0.75rem;

  background: #e9f7ef;
  color: #1f2d23;

  font-size: 0.92rem;
  line-height: 1.5;
}

.about-tip ion-icon {
  flex-shrink: 0;

  margin-top: 0.1rem;

  font-size: 1.25rem;
  color: #0e4b2e;
}

.about-link {
  display: inline-block;

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

.about-team-row {
  display: flex;
  flex-wrap: wrap;

  gap: 0.25rem 0.75rem;

  margin-bottom: 0.75rem;
}

.about-team-row:last-child {
  margin-bottom: 0;
}

.about-team-role {
  font-weight: 700;
  color: #1f2d23;
}

.about-team-name {
  display: inline-flex;
  align-items: center;

  gap: 0.4rem;

  color: #495057;
}

.about-linkedin {
  display: inline-flex;
  align-items: center;

  justify-content: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  color: #0d5132;
}

.about-linkedin ion-icon {
  font-size: 1.15rem;
}

.about-footer {
  display: flex;
  flex-direction: column;

  gap: 0.25rem;

  margin-top: 1.75rem;
  padding-top: 1.25rem;

  border-top:
    1px solid #dee2e6;

  color: #6c757d;
}

@media (min-width: 576px) {
  .about-footer {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
