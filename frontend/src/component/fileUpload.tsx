import LinearProgress, {
	type LinearProgressProps
} from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useEffect, useState, type ChangeEvent } from 'react'

type FileProgress = {
	id: string
	file: File
	progress: number
	uploaded: boolean
}

type FileUploadProps = {
	loading: boolean
	ref: React.RefObject<HTMLInputElement | null>
	setFile: (file: File | null) => void
	isDisabled: boolean
}

export function FileUpload({
	loading,
	ref,
	setFile,
	isDisabled
}: FileUploadProps) {
	const [selectedFile, setSelectedFile] = useState<FileProgress | null>(null)
	const [fileIsReady, setFileIsReady] = useState<boolean>(false)

	const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files?.length) return

		const newFile = {
			id: e.target.files[0].name,
			file: e.target.files[0],
			progress: 0,
			uploaded: false
		}

		setSelectedFile(newFile)

		if (ref.current) {
			ref.current.value = ''
		}
	}

	const handleRemoveFile = () => setSelectedFile(null)

	const handleLoadingFile = () => {
		if (selectedFile === null) return

		let progress = selectedFile.progress
		const interval = setInterval(() => {
			progress += 10
			if (progress >= 100) {
				progress = 100
				setSelectedFile((prev) =>
					prev ? { ...prev, progress: 100, uploaded: true } : null
				)
				setFileIsReady(true)
				clearInterval(interval)
			} else {
				setSelectedFile((prev) => (prev ? { ...prev, progress } : null))
			}
		}, 200)
	}

	useEffect(() => {
		handleLoadingFile()
		setFile(selectedFile ? selectedFile.file : null)
	}, [selectedFile, setFile])

	return (
		<div className='flex flex-col gap-4 text-white'>
			<FileInput
				inputRef={ref}
				disabled={loading || isDisabled}
				onFileSelect={handleFileSelect}
				selectedFile={selectedFile}
			/>
			{selectedFile ? (
				<FileDisplay
					file={selectedFile}
					onRemove={handleRemoveFile}
					fileIsReady={fileIsReady}
					uploading={loading}
				/>
			) : (
				<span className='mb-10'>Nenhum arquivo selecionado</span>
			)}
		</div>
	)
}

type FileInputProps = {
	inputRef: React.RefObject<HTMLInputElement | null>
	disabled: boolean
	onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void
	selectedFile: FileProgress | null
}

function FileInput({
	inputRef,
	disabled,
	onFileSelect,
	selectedFile
}: FileInputProps) {
	return (
		<div className='flex items-center gap-4 w-full'>
			<input
				type='file'
				ref={inputRef}
				onChange={onFileSelect}
				className='hidden'
				id='file-upload'
				disabled={disabled}
			/>
			<label
				htmlFor='file-upload'
				className={
					'w-full text-white text-lg border border-dashed px-10 py-10 rounded-md cursor-pointer shadow-xl w-[45%] text-center transition ' +
					(disabled || selectedFile
						? 'opacity-50 cursor-not-allowed'
						: 'hover:bg-gray-300 hover:text-black')
				}>
				Carregar arquivo (.pdf ou .txt)
			</label>
		</div>
	)
}

type FileDisplayProps = {
	file: FileProgress
	onRemove: () => void
	uploading: boolean
	fileIsReady: boolean
}

function FileDisplay({
	file,
	onRemove,
	fileIsReady,
	uploading
}: FileDisplayProps) {
	return (
		<div className='space-y-2'>
			<div className='space-y-2'>
				<FileItem
					file={file}
					onRemove={onRemove}
					fileIsReady={fileIsReady}
					uploading={uploading}
				/>
			</div>
		</div>
	)
}

type FileItemProps = {
	file: FileProgress
	onRemove: () => void
	fileIsReady: boolean
	uploading: boolean
}

function FileItem({ file, onRemove, fileIsReady, uploading }: FileItemProps) {
	return (
		<div className='space-y-2 rounded-md'>
			<div className='flex items-start justify-between'>
				<div className='flex items-center gap-3'>
					<i
						className={`${getFileIcon(
							file.file.type
						)} text-2xl`}></i>
					<div className='flex flex-col'>
						<span className='font-medium'>{file.file.name}</span>
						<div className='flex items-center gap-2 text-xs text-grayscale-400'>
							<span>{formatFileSize(file.file.size)}</span>
							<span>.</span>
							<span>{file.file.type || 'Unknown type'}</span>
						</div>
					</div>
				</div>
				{fileIsReady && (
					<button
						disabled={uploading}
						onClick={onRemove}>
						<i
							className={`fa-solid fa-trash text-lg ${
								uploading ? 'text-gray-400 cursor-not-allowed' : 'text-red-500'
							}`}></i>
					</button>
				)}
			</div>
			<div className='text-right text-xs'>
				{file.uploaded ? (
					<i className='fa-solid fa-check text-green-500 text-2xl'></i>
				) : (
					<LinearProgressWithLabel value={file.progress} />
				)}
			</div>
		</div>
	)
}

function LinearProgressWithLabel(
	props: LinearProgressProps & { value: number }
) {
	return (
		<Box sx={{ display: 'flex', alignItems: 'center' }}>
			<Box sx={{ width: '100%', mr: 1 }}>
				<LinearProgress
					variant='determinate'
					color='inherit'
					{...props}
				/>
			</Box>
			<Box sx={{ minWidth: 35 }}>
				<Typography
					variant='body2'
					sx={{ color: 'white' }}>{`${Math.round(
					props.value
				)}%`}</Typography>
			</Box>
		</Box>
	)
}

const getFileIcon = (MimeType: string): string => {
	if (MimeType === 'text/plain') return 'fa-solid fa-file-lines'
	if (MimeType === 'application/pdf') return 'fa-solid fa-file-pdf'
	return 'fa-solid fa-file'
}

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
