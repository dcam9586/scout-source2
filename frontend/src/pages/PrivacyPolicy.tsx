/**
 * Privacy Policy Page
 * Standard boilerplate privacy policy for SaaS applications
 */

import React from 'react';
import { Page, Card, BlockStack, Text } from '@shopify/polaris';
import Footer from '../components/Footer';

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = 'February 2, 2026';

  return (
    <>
      <Page title="Privacy Policy" narrowWidth>
        <BlockStack gap="600">
          <Card>
            <BlockStack gap="400">
              <Text as="p" tone="subdued">Last updated: {lastUpdated}</Text>
              
              <Text as="h2" variant="headingMd">1. Introduction</Text>
              <Text as="p">
                SourceScout ("we," "our," or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you use our product sourcing platform and related services.
              </Text>

              <Text as="h2" variant="headingMd">2. Information We Collect</Text>
              <Text as="h3" variant="headingSm">2.1 Information You Provide</Text>
              <Text as="p">
                We collect information you voluntarily provide when using our services, including:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Shopify store information (store name, email, domain)</li>
                <li>Search queries and saved products</li>
                <li>Supplier comparison preferences</li>
                <li>Account settings and API configurations</li>
              </ul>

              <Text as="h3" variant="headingSm">2.2 Automatically Collected Information</Text>
              <Text as="p">
                When you access our platform, we automatically collect:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Device and browser information</li>
                <li>IP address and location data</li>
                <li>Usage patterns and feature interactions</li>
                <li>Session duration and page views</li>
              </ul>

              <Text as="h2" variant="headingMd">3. How We Use Your Information</Text>
              <Text as="p">
                We use the collected information to:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Provide and maintain our product sourcing services</li>
                <li>Process your search queries across multiple supplier platforms</li>
                <li>Save and sync your product preferences across devices</li>
                <li>Improve our algorithms and user experience</li>
                <li>Send important service updates and notifications</li>
                <li>Detect and prevent fraudulent activities</li>
              </ul>

              <Text as="h2" variant="headingMd">4. Information Sharing</Text>
              <Text as="p">
                We do not sell your personal information. We may share data with:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li><strong>Shopify:</strong> To authenticate and integrate with your store</li>
                <li><strong>Service Providers:</strong> Cloud hosting, analytics, and support tools</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
              </ul>

              <Text as="h2" variant="headingMd">5. Data Security</Text>
              <Text as="p">
                We implement industry-standard security measures including:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>SSL/TLS encryption for all data transmission</li>
                <li>Encrypted database storage</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and authentication protocols</li>
              </ul>

              <Text as="h2" variant="headingMd">6. Your Rights</Text>
              <Text as="p">
                You have the right to:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of marketing communications</li>
              </ul>

              <Text as="h2" variant="headingMd">7. Cookies and Tracking</Text>
              <Text as="p">
                We use essential cookies for authentication and session management. 
                We may also use analytics cookies to understand usage patterns. 
                You can control cookie preferences through your browser settings.
              </Text>

              <Text as="h2" variant="headingMd">8. Data Retention</Text>
              <Text as="p">
                We retain your data for as long as your account is active or as needed 
                to provide services. Upon account deletion, we remove personal data within 
                30 days, except where retention is required by law.
              </Text>

              <Text as="h2" variant="headingMd">9. Children's Privacy</Text>
              <Text as="p">
                Our services are not intended for users under 18 years of age. 
                We do not knowingly collect information from children.
              </Text>

              <Text as="h2" variant="headingMd">10. Changes to This Policy</Text>
              <Text as="p">
                We may update this Privacy Policy periodically. We will notify you of 
                significant changes via email or prominent notice on our platform.
              </Text>

              <Text as="h2" variant="headingMd">11. Contact Us</Text>
              <Text as="p">
                For privacy-related inquiries, contact us at:
              </Text>
              <Text as="p">
                <strong>Email:</strong> privacy@sourcescout.io<br />
                <strong>Address:</strong> SourceScout Inc., San Francisco, CA
              </Text>
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
