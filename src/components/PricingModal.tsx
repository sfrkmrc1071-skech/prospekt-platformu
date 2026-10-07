import React from 'react';
import { User } from '../types';
import { MembershipPlansView } from './MembershipPlansView';

interface PricingModalProps {
  currentUser: User;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ currentUser, onClose }) => {
  return (
    <MembershipPlansView 
      currentUser={currentUser} 
      onClose={onClose} 
      isModal={true} 
    />
  );
};
