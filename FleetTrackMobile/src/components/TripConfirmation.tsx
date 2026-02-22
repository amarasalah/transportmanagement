/**
 * TripConfirmation - Full-screen photo capture modal
 * Driver must take 4 photos to confirm trip begin or end:
 *   1. Tableau de bord (dashboard/odometer)
 *   2. Camion complet (full truck exterior)
 *   3. Document (BC at begin, BL at end)
 *   4. Chargement/Déchargement (cargo)
 */
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, Image,
    Alert, ActivityIndicator, ScrollView, SafeAreaView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { uploadMultiple } from '../services/cloudinary';
import { updateStatusWithPhotos } from '../services/planning';
import { Planification, TripPhotos } from '../types';

interface TripConfirmationProps {
    visible: boolean;
    plan: Planification | null;
    mode: 'begin' | 'end'; // begin = planifié→en_cours, end = en_cours→terminé
    onClose: () => void;
    onConfirmed: () => void;
}

interface PhotoSlot {
    key: string;
    label: string;
    icon: string;
    description: string;
}

const BEGIN_SLOTS: PhotoSlot[] = [
    { key: 'dashboard', label: 'Tableau de bord', icon: 'speedometer', description: 'Photo du compteur kilométrique' },
    { key: 'fullTruck', label: 'Camion complet', icon: 'truck', description: 'Photo extérieure complète du camion' },
    { key: 'document', label: 'Bon de commande', icon: 'file-document', description: 'Photo du bon de commande papier' },
    { key: 'cargo', label: 'Chargement', icon: 'package-variant', description: 'Photo du chargement dans le camion' },
];

const END_SLOTS: PhotoSlot[] = [
    { key: 'dashboard', label: 'Tableau de bord', icon: 'speedometer', description: 'Photo du compteur à l\'arrivée' },
    { key: 'fullTruck', label: 'Camion complet', icon: 'truck', description: 'Photo extérieure à la destination' },
    { key: 'document', label: 'Bon de livraison', icon: 'file-check', description: 'Photo du bon de livraison signé' },
    { key: 'cargo', label: 'Déchargement', icon: 'package-variant-closed', description: 'Photo après déchargement' },
];

export default function TripConfirmation({ visible, plan, mode, onClose, onConfirmed }: TripConfirmationProps) {
    const [photos, setPhotos] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 4 });

    const slots = mode === 'begin' ? BEGIN_SLOTS : END_SLOTS;
    const completedCount = Object.keys(photos).length;
    const allDone = completedCount === 4;

    const pickImage = async (slot: PhotoSlot) => {
        Alert.alert(
            slot.label,
            'Choisir la source de la photo',
            [
                {
                    text: '📷 Caméra', onPress: async () => {
                        const perm = await ImagePicker.requestCameraPermissionsAsync();
                        if (!perm.granted) { Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra'); return; }
                        const result = await ImagePicker.launchCameraAsync({
                            quality: 0.7,
                            allowsEditing: false,
                        });
                        if (!result.canceled && result.assets[0]) {
                            setPhotos(prev => ({ ...prev, [slot.key]: result.assets[0].uri }));
                        }
                    }
                },
                {
                    text: '🖼️ Galerie', onPress: async () => {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!perm.granted) { Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie'); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            quality: 0.7,
                            allowsEditing: false,
                        });
                        if (!result.canceled && result.assets[0]) {
                            setPhotos(prev => ({ ...prev, [slot.key]: result.assets[0].uri }));
                        }
                    }
                },
                { text: 'Annuler', style: 'cancel' },
            ]
        );
    };

    const handleConfirm = async () => {
        if (!allDone || !plan) return;

        setUploading(true);
        try {
            const folder = `trip-confirmations/${plan.id}/${mode}`;
            const images = Object.entries(photos).map(([key, uri]) => ({ key, uri }));

            const uploadedUrls = await uploadMultiple(images, folder, (done, total) => {
                setUploadProgress({ done, total });
            });

            const tripPhotos: TripPhotos = {
                dashboard: uploadedUrls.dashboard || '',
                fullTruck: uploadedUrls.fullTruck || '',
                document: uploadedUrls.document || '',
                cargo: uploadedUrls.cargo || '',
                timestamp: new Date().toISOString(),
            };

            const newStatus = mode === 'begin' ? 'en_cours' : 'attente_confirmation';
            await updateStatusWithPhotos(plan.id, newStatus, tripPhotos);

            Alert.alert(
                '✅ Confirmé !',
                mode === 'begin'
                    ? 'Voyage démarré avec succès. Bonne route !'
                    : 'Photos envoyées ! En attente de confirmation de l\'admin.',
            );

            setPhotos({});
            onConfirmed();
        } catch (error: any) {
            console.error('[TripConfirm] Error:', error);
            Alert.alert('Erreur', error.message || 'Échec de l\'envoi des photos');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (uploading) return;
        if (completedCount > 0) {
            Alert.alert('Annuler ?', 'Vos photos seront perdues.', [
                { text: 'Continuer', style: 'cancel' },
                { text: 'Annuler', style: 'destructive', onPress: () => { setPhotos({}); onClose(); } },
            ]);
        } else {
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                        <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>
                            {mode === 'begin' ? '🚛 Démarrer le voyage' : '🏁 Terminer le voyage'}
                        </Text>
                        <Text style={styles.headerSub}>
                            {plan?.destination || 'Destination'} • {plan?.date || ''}
                        </Text>
                    </View>
                    <View style={styles.progressBadge}>
                        <Text style={styles.progressText}>{completedCount}/4</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${(completedCount / 4) * 100}%` }]} />
                </View>

                {/* Photo Slots */}
                <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                    {slots.map((slot, idx) => {
                        const hasPhoto = !!photos[slot.key];
                        return (
                            <TouchableOpacity
                                key={slot.key}
                                style={[styles.photoSlot, hasPhoto && styles.photoSlotDone]}
                                onPress={() => pickImage(slot)}
                                activeOpacity={0.7}
                            >
                                {hasPhoto ? (
                                    <Image source={{ uri: photos[slot.key] }} style={styles.photoPreview} />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <MaterialCommunityIcons
                                            name={slot.icon as any}
                                            size={40}
                                            color={Colors.textSecondary}
                                        />
                                    </View>
                                )}
                                <View style={styles.slotInfo}>
                                    <View style={styles.slotHeader}>
                                        <Text style={styles.slotNumber}>{idx + 1}</Text>
                                        <Text style={styles.slotLabel}>{slot.label}</Text>
                                        {hasPhoto && (
                                            <MaterialCommunityIcons name="check-circle" size={20} color={Colors.positive} />
                                        )}
                                    </View>
                                    <Text style={styles.slotDesc}>{slot.description}</Text>
                                    <Text style={styles.slotAction}>
                                        {hasPhoto ? '🔄 Reprendre la photo' : '📷 Prendre la photo'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Bottom Action */}
                <View style={styles.bottomBar}>
                    {uploading ? (
                        <View style={styles.uploadingBar}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.uploadingText}>
                                Envoi {uploadProgress.done}/{uploadProgress.total}...
                            </Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.confirmBtn, !allDone && styles.confirmBtnDisabled]}
                            onPress={handleConfirm}
                            disabled={!allDone}
                        >
                            <MaterialCommunityIcons
                                name={mode === 'begin' ? 'truck-fast' : 'flag-checkered'}
                                size={22}
                                color="#fff"
                            />
                            <Text style={styles.confirmText}>
                                {mode === 'begin' ? 'Confirmer le départ' : 'Confirmer l\'arrivée'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148,163,184,0.1)',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(51,65,85,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSub: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    progressBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: FontSize.md,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: 'rgba(51,65,85,0.3)',
    },
    progressBarFill: {
        height: 4,
        backgroundColor: Colors.positive,
        borderRadius: 2,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    photoSlot: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30,41,59,0.6)',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.1)',
    },
    photoSlotDone: {
        borderColor: Colors.positive,
        borderWidth: 1.5,
    },
    photoPreview: {
        width: 110,
        height: 110,
        resizeMode: 'cover',
    },
    photoPlaceholder: {
        width: 110,
        height: 110,
        backgroundColor: 'rgba(15,23,42,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotInfo: {
        flex: 1,
        padding: Spacing.sm,
        justifyContent: 'center',
    },
    slotHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    slotNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        color: '#fff',
        textAlign: 'center',
        lineHeight: 24,
        fontSize: FontSize.xs,
        fontWeight: '700',
        overflow: 'hidden',
    },
    slotLabel: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.text,
        flex: 1,
    },
    slotDesc: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    slotAction: {
        fontSize: FontSize.xs,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: 6,
    },
    bottomBar: {
        padding: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148,163,184,0.1)',
    },
    uploadingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: Colors.warning,
        paddingVertical: 16,
        borderRadius: BorderRadius.lg,
    },
    uploadingText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: Colors.positive,
        paddingVertical: 16,
        borderRadius: BorderRadius.lg,
    },
    confirmBtnDisabled: {
        backgroundColor: 'rgba(51,65,85,0.5)',
    },
    confirmText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
