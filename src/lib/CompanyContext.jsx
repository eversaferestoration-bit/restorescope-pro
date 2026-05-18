import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const CompanyContext = createContext(null);

/**
 * CompanyProvider resolves and exposes activeCompany and companyId globally.
 * Must be mounted inside AuthProvider.
 * 
 * Usage: const { activeCompany, companyId, companyLoading } = useCompany();
 */
export function CompanyProvider({ children }) {
  const { user, userProfile } = useAuth();
  const [activeCompany, setActiveCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const prevCompanyId = useRef(null);

  // Canonical companyId — resolved from userProfile or user object
  const rawCompanyId = userProfile?.company_id || user?.company_id || null;

  useEffect(() => {
    if (!user) {
      setActiveCompany(null);
      setCompanyLoading(false);
      return;
    }

    // Skip if we already loaded this company
    if (rawCompanyId && rawCompanyId === prevCompanyId.current && activeCompany?.id === rawCompanyId) {
      setCompanyLoading(false);
      return;
    }

    let cancelled = false;
    async function resolve() {
      setCompanyLoading(true);
      try {
        let company = null;

        // 1. Try direct lookup by companyId
        if (rawCompanyId) {
          try {
            company = await base44.entities.Company.get(rawCompanyId);
            if (company?.is_deleted) company = null;
          } catch (err) {
            console.warn('[CompanyContext] Company.get failed:', err?.message);
            company = null;
          }
        }

        // 2. Fallback: search by creator email
        if (!company && user?.email) {
          try {
            const companies = await base44.entities.Company.filter(
              { created_by: user.email, is_deleted: false }, '-created_date', 1
            );
            company = companies?.[0] || null;
            console.log('[CompanyContext] Resolved company by email:', company?.id, company?.name);
          } catch (err) {
            console.warn('[CompanyContext] Company filter by email failed:', err?.message);
          }
        }

        // 3. Fallback: search by manager/owner role
        if (!company && user?.email) {
          try {
            const companies = await base44.entities.Company.filter(
              { email: user.email, is_deleted: false }, '-created_date', 1
            );
            company = companies?.[0] || null;
          } catch (err) {
            console.warn('[CompanyContext] Company filter by company.email failed:', err?.message);
          }
        }

        if (!cancelled) {
          if (company?.id) {
            prevCompanyId.current = company.id;
            console.log('[CompanyContext] activeCompany set:', company.id, company.name);
          } else {
            console.warn('[CompanyContext] Could not resolve activeCompany for user:', user?.email);
          }
          setActiveCompany(company);
        }
      } finally {
        if (!cancelled) setCompanyLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [user?.id, rawCompanyId]);

  const companyId = activeCompany?.id || rawCompanyId || null;

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, companyId, companyLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}