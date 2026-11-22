import {useContext} from 'react';
import {CompanionContext} from '../context/companionContext';
export function useTodayFeedback(){const value=useContext(CompanionContext);if(!value)throw new Error('CompanionProvider eksik.');return value;}
