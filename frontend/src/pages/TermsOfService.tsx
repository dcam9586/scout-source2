/**
 * Terms of Service Page
 * Standard boilerplate terms for SaaS applications
 */

import React from 'react';
import { Page, Card, BlockStack, Text } from '@shopify/polaris';
import Footer from '../components/Footer';

const TermsOfService: React.FC = () => {
  const lastUpdated = 'February 2, 2026';

  return (
    <>
      <Page title="Terms of Service" narrowWidth>
        <BlockStack gap="600">
          <Card>
            <BlockStack gap="400">
              <Text as="p" tone="subdued">Last updated: {lastUpdated}</Text>
              
              <Text as="h2" variant="headingMd">1. Acceptance of Terms</Text>
              <Text as="p">
                By accessing or using SourceScout ("Service"), you agree to be bound by these 
                Terms of Service ("Terms"). If you disagree with any part of these terms, 
                you may not access the Service.
              </Text>

              <Text as="h2" variant="headingMd">2. Description of Service</Text>
              <Text as="p">
                SourceScout is a product sourcing platform that allows users to search, compare, 
                and analyze products across multiple supplier marketplaces including Alibaba, 
                Made-in-China, and CJ Dropshipping. The Service integrates with Shopify to 
                enable seamless product management.
              </Text>

              <Text as="h2" variant="headingMd">3. Account Registration</Text>
              <Text as="p">
                To use the Service, you must:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Have a valid Shopify store</li>
                <li>Authenticate through Shopify OAuth</li>
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
              </ul>
              <Text as="p">
                You are responsible for all activities that occur under your account.
              </Text>

              <Text as="h2" variant="headingMd">4. Acceptable Use</Text>
              <Text as="p">
                You agree NOT to:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Use the Service for any illegal purposes</li>
                <li>Attempt to reverse engineer or extract source code</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated systems to scrape or abuse the Service</li>
                <li>Resell access to the Service without authorization</li>
                <li>Violate intellectual property rights of third parties</li>
              </ul>

              <Text as="h2" variant="headingMd">5. Third-Party Services</Text>
              <Text as="p">
                The Service aggregates data from third-party suppliers (Alibaba, Made-in-China, 
                CJ Dropshipping, etc.). We do not control these platforms and are not responsible 
                for their accuracy, availability, or policies. Your transactions with suppliers 
                are solely between you and the supplier.
              </Text>

              <Text as="h2" variant="headingMd">6. Intellectual Property</Text>
              <Text as="p">
                The Service, including its original content, features, and functionality, is 
                owned by SourceScout and protected by copyright, trademark, and other laws. 
                Our trademarks may not be used without prior written consent.
              </Text>

              <Text as="h2" variant="headingMd">7. Subscription and Payments</Text>
              <Text as="p">
                Certain features may require a paid subscription. By subscribing, you agree to:
              </Text>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Pay all applicable fees as described at time of purchase</li>
                <li>Automatic renewal unless cancelled before renewal date</li>
                <li>No refunds for partial billing periods</li>
              </ul>

              <Text as="h2" variant="headingMd">8. Disclaimer of Warranties</Text>
              <Text as="p">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR 
                IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, 
                OR ERROR-FREE.
              </Text>
              <Text as="p">
                Product information, pricing, and supplier details are aggregated from third 
                parties and may not be accurate or current. Always verify with suppliers directly.
              </Text>

              <Text as="h2" variant="headingMd">9. Limitation of Liability</Text>
              <Text as="p">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOURCESCOUT SHALL NOT BE LIABLE FOR 
                ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
                LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES.
              </Text>
              <Text as="p">
                Our total liability shall not exceed the amount paid by you for the Service 
                in the twelve (12) months preceding the claim.
              </Text>

              <Text as="h2" variant="headingMd">10. Indemnification</Text>
              <Text as="p">
                You agree to indemnify and hold harmless SourceScout and its affiliates from 
                any claims, damages, or expenses arising from your use of the Service or 
                violation of these Terms.
              </Text>

              <Text as="h2" variant="headingMd">11. Termination</Text>
              <Text as="p">
                We may terminate or suspend your account immediately, without prior notice, 
                for conduct that we believe violates these Terms or is harmful to other users, 
                third parties, or the Service.
              </Text>
              <Text as="p">
                Upon termination, your right to use the Service will cease immediately.
              </Text>

              <Text as="h2" variant="headingMd">12. Governing Law</Text>
              <Text as="p">
                These Terms shall be governed by the laws of the State of California, USA, 
                without regard to its conflict of law provisions. Any disputes shall be 
                resolved in the courts of San Francisco County, California.
              </Text>

              <Text as="h2" variant="headingMd">13. Changes to Terms</Text>
              <Text as="p">
                We reserve the right to modify these Terms at any time. We will provide 
                notice of significant changes. Continued use of the Service after changes 
                constitutes acceptance of the new Terms.
              </Text>

              <Text as="h2" variant="headingMd">14. Contact Information</Text>
              <Text as="p">
                For questions about these Terms, contact us at:
              </Text>
              <Text as="p">
                <strong>Email:</strong> legal@sourcescout.io<br />
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

export default TermsOfService;
