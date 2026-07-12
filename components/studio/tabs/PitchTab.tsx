'use client';
import React, { useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Video, FileText, Music, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import ParticleBackground from '@/components/ParticleBackground';
import { useColorExtractor } from '@/hooks/useColorExtractor';
import { AmbientGradient } from '@/components/ui/AmbientGradient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import AnimatedSection from '@/components/AnimatedSection';
import SectionLabel from '@/components/SectionLabel';
import { supabase } from '@/lib/supabase/client';
import { getUserProjects } from '@/lib/supabase/projects';
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useEscapeKey } from '@/lib/useEscapeKey';
import Avatar from '@/components/Avatar';
import { useEffect, useMemo } from 'react';
import { useProject } from '@/lib/os';
import { getProjectModules } from '@/lib/types/settings';
import { usePillStage, usePillZone } from '@/lib/context/PillContext';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { saveScript } from '@/lib/scriptos/storage';
import { parseScript } from '@/lib/scriptos/parser';
import { getActivities, subscribeToActivities, type Activity } from '@/lib/supabase/activity';
import { getAllStudioAssets, getStudioBoards, getProjectBoards, createStudioBoard, getStudioAssets, deleteStudioAsset, addStudioAsset, getProjectBeats, createProjectBeat, deleteProjectBeat, uploadStudioFile } from '@/lib/supabase/studio';
import { searchProfiles, inviteToCrew } from '@/lib/supabase/profiles';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { getCastingsForProject, setCasting, removeCasting, type Casting } from '@/lib/supabase/casting';
import { syncSceneElementsFromScript, syncBudgetFromSceneElements, ELEMENT_CATEGORIES, type ElementCategory } from '@/lib/supabase/breakdown';
import { LayoutGrid, ClipboardList, BookOpen, Layers, Archive, CheckCircle2, Maximize2, Filter, Grid, List as ListIcon, Info, DollarSign, Calendar, MessageSquare, Clock, MapPin, Download, Megaphone, Share2, Eye, TrendingUp, Users, Trash2, Search, AlertCircle, ChevronLeft, ChevronRight, X, Tags } from 'lucide-react';
import { searchReferences, type ReferenceResult } from '@/lib/references/search';
import EmptyState from '@/components/EmptyState';
import { useOSGate } from '@/lib/os';
import { awaitOSUser } from '@/lib/os';
import type { Asset } from '@/components/studio/constants';
import { STAGES, TYPE_ICONS, TYPE_COLORS } from '@/components/studio/constants';
import { AssetCard, AssetReviewModal, IntakeModal } from '@/components/studio/AssetLibrary';
import { ProjectCard, StageIndicator } from '@/components/studio/ProjectCards';
import { ConceptLightbox, ConceptCard, ReferenceSearchModal } from '@/components/studio/ConceptBoard';
import { ProjectPitchDeck } from '@/components/studio/PitchDeck';
import { CharacterBible } from '@/components/studio/CharacterBible';
import { CastingBoard } from '@/components/studio/CastingBoard';
import { Stripboard, CallSheets } from '@/components/studio/ProductionBoards';
import { BeatCard, CrewMemberCard, RecruitModal } from '@/components/studio/CrewBoards';
import type { StudioCtx } from './ctx';

export function PitchTab({ ctx }: { ctx: StudioCtx }) {
  const { activeProject, beats } = ctx;
  if (!activeProject) return null;
  return (

          activeProject ? (
            <ProjectPitchDeck project={activeProject} concepts={(activeProject.concept_assets || []) as any[]} beats={beats} />
          ) : (
            <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2 }}>SELECT A PROJECT TO BUILD A PITCH</div>
          )
        
  );
}
