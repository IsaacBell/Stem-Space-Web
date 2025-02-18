'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FieldValues, SubmitHandler } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import uniqid from 'uniqid';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import useUploadModal from '@/hooks/useUploadModal';
import { useUser } from '@/hooks/useUser';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

const UploadModal = () => {
  const uploadModal = useUploadModal();
  const [isLoading, setisLoading] = useState(false);
  const { user } = useUser();
  const supabaseClient = useSupabaseClient();
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: {
      author: '',
      title: '',
      song: null,
      image: null,
    },
  });

  const onChange = (open: boolean) => {
    if (!open) {
      reset();
      uploadModal.onClose();
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (values) => {
    try {
      setisLoading(true);
      const imageFile = values.image?.[0];
      const songFile = values.song?.[0];

      if (!imageFile || !songFile || !user) {
        toast.error('Missing fields');
        return;
      }

      //upload song
      const { data: songData, error: songError } = await supabaseClient.storage
        .from('songs')
        .upload(`image_${user?.id}_${values.song?.[0]?.name}`, songFile, {
          cacheControl: '3600',
          upsert: false,
        });

        console.log({songData, songError})
      if (songError) {
        setisLoading(false);
        return toast.error(songError.message ?? 'Failed song upload');
      }

      const { data: imageData, error: imageError } =
        await supabaseClient.storage
          .from('images')
          .upload(`image_${user?.id}_${values?.song_name ?? 'upload'}`, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });
          console.log({imageData, imageError})
      if (imageError) {
        setisLoading(false);
        return toast.error(imageError.message ?? 'Failed image upload');
      }

      const { error: supabaseError } = await supabaseClient
        .from('songs')
        .insert({
          user_id: user.id,
          title: values.title,
          author: values.author,
          image_path: imageData.path,
          song_path: songData.path,
        });

      if (supabaseError) {
        console.log({supabaseError})
        setisLoading(false);
        return toast.error(supabaseError.message);
      }
      router.refresh();
      setisLoading(false);
      toast.success('Song created!');
      reset();
      uploadModal.onClose();
    } catch (error) {
      toast.error('Something went wrong! Please try again');
    } finally {
      setisLoading(false);
    }
  };

  return (
    <Modal
      title="Add a song"
      description="Upload a music file"
      isOpen={uploadModal.isOpen}
      onChange={onChange}
    >
      <form
        className="flex  flex-col gap-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Input
          id="title"
          disabled={isLoading}
          {...register('title', { required: true })}
          placeholder="Song title"
        />
        <Input
          id="author"
          disabled={isLoading}
          {...register('author', { required: true })}
          placeholder="Artist Name"
        />
        <div className="pb-1">
          <div>Select a song file</div>
          <Input
            type="file"
            id="song"
            disabled={isLoading}
            {...register('song', { required: true })}
            accept="audio/*"
          />
        </div>
        <div className="pb-1">
          <div>Upload cover art</div>
          <Input
            type="file"
            id="image"
            disabled={isLoading}
            {...register('image', { required: true })}
            accept="image/*"
          />
        </div>
        <div className="pb-1">
          <div>Generate cover art</div>
          <Input
            id="image-gen"
            disabled={isLoading}
            placeholder="Description of your cover"
            {...register('image-gen', { required: true })}
          />
        </div>
        <Button disabled={isLoading} type="submit">
          Create
        </Button>
      </form>
    </Modal>
  );
};

export default UploadModal;
