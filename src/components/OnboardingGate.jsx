import {useSyncExternalStore} from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {getPersonalSnapshot,subscribePersonal} from '../data/personalStorage';
import {PersonalGate} from './PersonalDocuments';
import {shouldOfferOnboarding} from '../utils/onboarding';
function Decision({children}){const state=useSyncExternalStore(subscribePersonal,getPersonalSnapshot,getPersonalSnapshot);return shouldOfferOnboarding(state)?<Navigate to="/welcome" replace/>:children;}
export default function OnboardingGate({children}){const {user}=useAuth();if(!user)return children;return <PersonalGate keys={['onboarding','targets','plan','profile']} preserveOnSave><Decision>{children}</Decision></PersonalGate>;}
